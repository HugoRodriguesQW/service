import express from "express";
import {
  deleteSoccerGame,
  insertNewSoccerGame,
  searchSoccerGame,
  updateSoccerGame,
} from "../../database/functions.js";
import responseError from "../../utils/errors.js";
import { createGameId } from "../../utils/token.js";
import schemas from "../../schemas.json" assert { type: "json" };
import { ArrToObj, DotObj, ObjToArr } from "../../utils/converter.js";
import { getGameStatus } from "../../utils/soccer.js";
import { Connection } from "../../database/connection.js";
import Response from "../../utils/response.js";

const router = express();

router.patch("/close/:id", async (req, res) => {
  const id = req.params.id;
  const score = req.body.score;

  if (typeof score.visited !== "number" || typeof score.visitor !== "number") {
    return responseError(res, 400);
  }

  await searchSoccerGame({ id }).then(async (game) => {
    if (getGameStatus(game) !== "running") return responseError(res, 403);

    await updateSoccerGame({ id, props: { status: "closed", score } }).then(
      ({ acknowledged }) => {
        if (!acknowledged) return responseError(res, 501);
        console.info("a1");
        Connection.emit("update-game", { ...game, score, status: "closed" });

        return Response(req, res, { acknowledged });
      },
      () => {
        responseError(res, 501);
      }
    );
  });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  await searchSoccerGame({ id }).then(async (game) => {
    if (!game.id) return responseError(res, 510);

    switch (getGameStatus(game)) {
      case "opened":
        await deleteSoccerGame({ id }).then(
          ({ deletedCount }) => {
            if (!!deletedCount) {
              Connection.emit("delete-game", game);
            }
            return Response(req, res, { deleted: !!deletedCount, id });
          },
          () => {
            responseError(res, 501);
          }
        );
        break;
      case "running":
        await updateSoccerGame({ id, props: { status: "canceled" } }).then(
          ({ acknowledged }) => {
            if (!acknowledged) return responseError(res, 501);
            console.info("a2");
            Connection.emit("update-game", { ...game, status: "canceled" });

            return Response(req, res, { acknowledged });
          },
          () => {
            responseError(res, 501);
          }
        );
        break;
      default:
        responseError(res, 403);
    }
  });
});

router.patch("/score/:id", async (req, res) => {
  const id = req.params.id;
  const { visited, visitor } = req.body.score;

  if (typeof visited !== "number" || typeof visitor !== "number") {
    return responseError(res, 400);
  }

  if ([visitor, visited].every((v) => typeof v === "number") === false) {
    return responseError(res, 401);
  }

  await searchSoccerGame({ id }).then(async (game) => {
    if (!game.id) return responseError(res, 510);

    if (getGameStatus(game) !== "running") return responseError(res, 403);

    await updateSoccerGame({ id, props: { score: { visited, visitor } } }).then(
      ({ acknowledged }) => {
        if (!acknowledged) return responseError(res, 501);
        console.info("a3");
        Connection.emit("update-game", {
          ...game,
          score: { visited, visitor },
        });

        Response(req, res, {
          acknowledged,
        });
      },
      () => {
        responseError(res, 501);
      }
    );
  });
});

router.patch("/:id", async (req, res) => {
  const id = req.params.id;

  if (!req.body || !id) return responseError(res, 400);

  const acceptProps = ObjToArr(req.body).filter(([key, value]) => {
    return schemas.game[key] && typeof value === schemas.game[key];
  });

  await searchSoccerGame({ id }).then(async (game) => {
    if (!game.id) return responseError(res, 510);

    await updateSoccerGame({ id, props: ArrToObj(acceptProps) }).then(
      ({ acknowledged }) => {
        if (!acknowledged) return responseError(res, 501);

        Connection.emit("update-game", {
          id,
          ...DotObj(ArrToObj(acceptProps)),
        });

        Response(req, res, {
          acknowledged,
          modified: DotObj(ArrToObj(acceptProps)),
        });
      },
      () => {
        responseError(res, 501);
      }
    );
  });
});

router.post("/", async (req, res) => {
  const { visited, visitor, date } = req.body ?? {};
  const { month, year } = res.locals.season;
  if (!visited.id || !visitor.id || !date) return responseError(res, 401);

  //TODO: Não criar jogos para temporadas encerradas

  await createGameId({ visited, visitor }).then(
    async (id) => {
      await insertNewSoccerGame({
        id,
        teams: { visited, visitor },
        date: new Date(date),
        reference: `${month}/${year}`,
      }).then(
        ({ acknowledged, game }) => {
          if (!acknowledged) responseError(res, 501);

          Connection.emit("insert-game", game);

          Response(req, res, {
            success: acknowledged,
            game,
          });
        },
        () => {
          responseError(res, 501);
        }
      );
    },
    () => {
      responseError(res, 501);
    }
  );
});

const adminSoccer = { router, methods: "" };
export default adminSoccer;
