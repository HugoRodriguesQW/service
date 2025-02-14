import {
  defaultProjection,
  onlyEmail,
  onlyId,
  temporally,
} from "../utils/projections.js";
import { Connection } from "./connection.js";
Connection.check();

export function getAllNotifications() {
  return new Promise(async (resolve, reject) => {
    Connection.notifications
      .find(
        {},
        {
          projection: temporally(),
        }
      )
      .toArray()
      .then(resolve, reject);
  });
}

export function getNotification({ id }) {
  return new Promise(async (resolve, reject) => {
    Connection.notifications
      .findOne(
        { id },
        {
          projection: temporally(),
        }
      )
      .then(resolve, reject);
  });
}

export function updateNotification({ id, props, func }) {
  return new Promise(async (resolve, reject) => {
    Connection.notifications
      .updateOne({ id }, { [`$${func ?? "set"}`]: props })
      .then(resolve, reject);
  });
}

export function newNotification({ id, title, message, ...params }) {
  return new Promise(async (resolve, reject) => {
    const expire = new Date();
    expire.setMonth(expire.getMonth() + 1);

    await Connection.notifications.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    Connection.notifications
      .insertOne({
        expireAt: expire,
        id,
        title,
        message,
        ...params,
        readlist: [],
      })
      .then(resolve, reject);
  });
}

export function updateGameEntry({ gameId, id, entry }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .updateOne(
        {
          id: gameId,
          "entries.id": id,
        },
        {
          $set: {
            "entries.$.visited": entry.visited,
            "entries.$.visitor": entry.visitor,
          },
        }
      )
      .then(resolve, reject);
  });
}

export function createNewGameEntry({ gameId, id, entry }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .updateOne(
        {
          id: gameId,
        },
        {
          $push: {
            entries: { id, visited: entry.visited, visitor: entry.visitor },
          },
        }
      )
      .then(resolve, reject);
  });
}

export function deleteSoccerGame({ id }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .deleteOne({
        id,
      })
      .then(resolve, reject);
  });
}

export function updateManyGames({ filter, props }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .updateMany(
        {
          ...filter,
        },
        {
          $set: props,
        }
      )

      .then(resolve, reject);
  });
}

export function updateSoccerGame({ id, props }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .updateOne(
        {
          id,
        },
        {
          $set: props,
        }
      )
      .then(resolve, reject);
  });
}

export function searchSoccerGame({ id }) {
  return new Promise((resolve, reject) => {
    Connection.games
      .findOne(
        {
          id,
        },
        {
          projection: temporally(),
        }
      )
      .then(resolve, reject);
  });
}

export function getAllSoccerGames(filter) {
  return new Promise((resolve, reject) => {
    Connection.games
      .find(filter ?? {}, {
        projection: temporally(),
      })
      .toArray()
      .then(resolve, reject);
  });
}

export async function insertNewSoccerGame({ id, teams, date, reference }) {
  const expire = new Date();
  expire.setMonth(expire.getMonth() + 1);

  await Connection.games.createIndex(
    { expireAt: 1 },
    { expireAfterSeconds: 0 }
  );

  const game = {
    expireAt: expire,
    logEvent: 1,
    logMessage: "Season Removed!",

    date,
    id,
    teams,
    reference,
    status: "opened",
    score: {
      visited: 0,
      visitor: 0,
    },
    entries: [],
  };

  return new Promise((resolve, reject) => {
    Connection.games.insertOne(game).then((re) => {
      resolve({ ...re, game });
    }, reject);
  });
}

export function getSeasonById({ id }) {
  return new Promise((resolve, reject) => {
    Connection.seasons
      .findOne(
        { id },
        {
          projection: temporally(),
        }
      )
      .then(resolve, reject);
  });
}

export function insertNewSeason({ id }) {
  return new Promise(async (resolve, reject) => {
    const expire = new Date();

    expire.setMonth(expire.getMonth() + 1);
    expire.setDate(expire.getDate() + 2);

    await Connection.seasons.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    const season = {
      expireAt: expire,
      running: true,
      logEvent: 1,
      logMessage: "Season Removed!",
      id,
      ticket: Number(process.env.APP_TICKET) ?? 3.5,
    };

    Connection.seasons.insertOne(season).then(({ acknowledged }) => {
      resolve({ acknowledged, season });
    }, reject);
  });
}

export function updateSeason({ id, func, props }) {
  return new Promise((resolve, reject) => {
    Connection.seasons
      .updateOne({ id }, { [`$${func ?? "set"}`]: props })
      .then(resolve, reject);
  });
}

export function getClientSeasonPayment({ season, id }) {
  return new Promise(async (resolve, reject) => {
    Connection.payments
      .findOne(
        { season, reference: id },
        {
          projection: temporally(),
        }
      )
      .then(resolve, reject);
  });
}

export function getAllPaymentBySeason({ season }) {
  return new Promise(async (resolve, reject) => {
    Connection.payments
      .find(
        { season },
        {
          projection: temporally(),
        }
      )
      .toArray()
      .then(resolve, reject);
  });
}

export function getAllPayments(options) {
  return new Promise(async (resolve, reject) => {
    Connection.payments.find({}, options).toArray().then(resolve, reject);
  });
}

export function searchPayment({ paymentId }) {
  return new Promise(async (resolve, reject) => {
    Connection.payments
      .findOne(
        {
          id: paymentId,
        },
        {
          projection: temporally(),
        }
      )
      .then(resolve, reject);
  });
}

export function deletePayment({ paymentId }) {
  return new Promise(async (resolve, reject) => {
    Connection.payments
      .deleteOne({
        id: paymentId,
      })
      .then(resolve, reject);
  });
}

export function insertAwardPayments({ winners, payIdPrefix }) {
  winners = winners.filter((w) => typeof w === "object");

  return new Promise(async (resolve, reject) => {
    const expire = new Date();

    expire.setMonth(expire.getMonth() + 1);

    await Connection.payments.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    Connection.payments
      .insertMany(
        winners.map((winner, position) => {
          return {
            expireAt: expire,
            logEvent: 1,
            logMessage: "Payment Removed!",
            value: -winner.award,
            type: "send",
            verified: false,
            id: `${payIdPrefix}${position + 1}`,
            reference: winner.id,
          };
        })
      )
      .then(resolve, reject);
  });
}

export function insertNewPayment({ value, paymentId, id }) {
  return new Promise(async (resolve, reject) => {
    const expire = new Date();

    if (expire.getDate() >= 25 && expire.getDate() < 28) expire.setDate(28);

    expire.setMonth(expire.getMonth() + 1);

    await Connection.payments.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    Connection.payments
      .insertOne({
        expireAt: expire,
        logEvent: 1,
        logMessage: "Payment Removed!",
        value,
        type: value > 0 ? "receive" : "send",
        verified: false,
        id: paymentId,
        reference: id,
      })
      .then(resolve, reject);
  });
}

export function updatePayment({ paymentId, props }) {
  return new Promise((resolve, reject) => {
    Connection.payments
      .updateOne({ id: paymentId }, { $set: props })
      .then(resolve, reject);
  });
}

export function getAllPaymentWithId({ id }, options) {
  return new Promise((resolve, reject) => {
    Connection.payments
      .find(
        { reference: id },
        {
          projection: defaultProjection(),
          ...options,
        }
      )
      .toArray()
      .then(resolve, reject);
  });
}

export function updateSession({ sessionId, props }) {
  return new Promise((resolve, reject) => {
    Connection.session
      .updateOne({ sessionId }, { $set: props })
      .then(resolve, reject);
  });
}
export function insertNewSession({ sessionId, id, password, email }) {
  return new Promise(async (accept, reject) => {
    const expire = new Date();
    expire.setDate(expire.getDate() + 2);

    await Connection.session.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    Connection.session
      .insertOne({
        expireAt: expire,
        logEvent: 1,
        logMessage: "Session Removed!",
        sessionId,
        id,
        password,
        email,
      })
      .then(accept, reject);
  });
}

export function searchSessionById({ sessionId }) {
  return new Promise((accept, reject) => {
    Connection.session
      .findOne(
        { sessionId },
        {
          projection: temporally(),
        }
      )
      .then(accept, reject);
  });
}

export function validationSearcher(parameter) {
  return new Promise((accept, reject) => {
    Connection.validation
      .findOne(parameter, {
        projection: temporally(),
      })
      .then(accept, reject);
  });
}

export function validationRemove(parameter) {
  return new Promise((accept, reject) => {
    Connection.validation.deleteOne(parameter).then(accept, reject);
  });
}

export function validationCreate({ type, value, reference }) {
  return new Promise(async (accept, reject) => {
    const expire = new Date();
    expire.setMinutes(expire.getMinutes() + 10);

    await Connection.validation.createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    await Connection.validation
      .insertOne({
        expireAt: expire,
        logEvent: 1,
        logMessage: "Validation Code Removed!",
        reference,
        [type]: value,
      })
      .then(accept, reject);
  });
}

export function getAllClients(options) {
  return new Promise((accept, reject) => {
    Connection.clients.find({}, options).toArray().then(accept, reject);
  });
}

export function insertNewClient({ name, email, password, id }) {
  // Inserir um novo client no Banco de dados
  return new Promise((accept, reject) => {
    Connection.clients
      .insertOne({
        id,
        data: {
          name,
          email: {
            address: email,
            verified: false,
          },
          pix: null,
          password,
          picture: null,
          admin: false,
        },
        config: {
          twosteps: false,
          video: true,
          darkmode: false,
        },
      })
      .then(accept, reject);
  });
}

export function updateClientByEmail({ email, props }) {
  return new Promise((resolve, reject) => {
    Connection.clients
      .updateOne({ "data.email.address": email }, { $set: props })
      .then(resolve, reject);
  });
}

export function updateClient({ id, props }) {
  return new Promise((resolve, reject) => {
    Connection.clients.updateOne({ id }, { $set: props }).then(resolve, reject);
  });
}

export function removeClient({ email, name, id }) {
  return new Promise((resolve, reject) => {
    Connection.clients
      .deleteOne({ "data.email.address": email, "data.name": name, id })
      .then(resolve, reject);
  });
}

export function validateClient({ id, email, password }) {
  // Validar um id ou verificar sua existência no Banco
  return new Promise((resolve, reject) => {
    Connection.clients
      .findOne(
        { id, "data.email.address": email, "data.password": password },
        {
          projection: defaultProjection(),
        }
      )
      .then((client) => {
        resolve({
          id: client?.id,
          admin: client?.data?.admin,
          verified: client?.data?.email?.verified,
        });
      }, reject);
  });
}

export function validateClientCredentials({ email, password }) {
  // Validar as credenciais ou verificar sua existência no Banco
  return new Promise((resolve, reject) => {
    Connection.clients
      .findOne(
        { "data.email.address": email, "data.password": password },
        {
          projection: defaultProjection(),
        }
      )
      .then((client) => {
        if (!client?.id) return reject("not-found");
        resolve(client);
      }, reject);
  });
}

export function getAllClientDataWithId({ id }) {
  // Encontrar um usuário com o ID e retornar os dados
  return new Promise((accept, reject) => {
    Connection.clients
      .findOne(
        { id },
        {
          projection: defaultProjection(),
        }
      )
      .then(accept, reject);
  });
}

export function findClientEmail({ email }) {
  // Encontrar um email na lista de clientes
  return new Promise((accept, reject) => {
    Connection.clients
      .findOne(
        { "data.email.address": email },
        {
          projection: onlyEmail(),
        }
      )
      .then((client) => {
        accept(client?.data.email ?? {});
      }, reject);
  });
}

export function findClientId({ id }) {
  // Encontrar um Id na lista de clientes
  return new Promise((accept, reject) => {
    Connection.clients
      .findOne(
        { id },
        {
          projection: onlyId(),
        }
      )
      .then((client) => {
        accept({ id: client?.id });
      }, reject);
  });
}
