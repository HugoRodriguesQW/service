import express from "express";
import {
  deletePayment,
  getAllPayments,
  updatePayment,
  updateSeason,
  getAllPaymentWithId,
} from "../../database/functions.js";
import { ObjToArr, ArrToObj } from "../../utils/converter.js";
import responseError from "../../utils/errors.js";
import schemas from "../../schemas.json" assert { type: "json" };

const router = express();

router.get("/all", async (req, res) => {
  await getAllPayments().then(
    (payments) => {
      if (!Array.isArray(payments)) return responseError(res, 501);
      res.json(payments);
    },
    () => {
      responseError(res, 501);
    }
  );
});

router.patch("/:paymentId", async (req, res) => {
  const paymentId = req.params.paymentId;
  const props = req.body.props;
  const reference = req.body.reference;

  if (!paymentId || !reference) return responseError(res, 400);

  if (props.verified === true) {
    const payments = await getAllPaymentWithId({ id: reference });
    const filteredPayments = payments
      ?.sort((a, b) => {
        return a.expireAt - b.expireAt;
      })
      .filter((payment) => {
        return payment.id !== paymentId && payment.verified === true;
      });

    const lastExpire =
      filteredPayments[filteredPayments.length - 1]?.expireAt ?? null;

    if (lastExpire) {
      lastExpire.setMonth(lastExpire.getMonth() + 1);
      props.expireAt = lastExpire;
    }

    res.locals.payments = payments;
  }

  const acceptProps = ObjToArr(props).filter(([key, value]) => {
    return schemas.payment[key] && typeof value === schemas.payment[key];
  });

  if (acceptProps.length <= 0) return responseError(res, 400);

  await updatePayment({ paymentId, props: ArrToObj(acceptProps) }).then(
    async ({ acknowledged, modifiedCount }) => {
      if (acknowledged && props.verified === true) {
        const payment =
          res.locals.payments?.filter((payment) => {
            return payment.id === paymentId;
          })[0] ?? null;

        payment &&
          (await updateSeason({
            id: Object.values(res.locals.season).join("/"),
            func: "inc",
            props: {
              amount: payment.value,
            },
          }));

        res.json({ acknowledged, modifiedCount });
      }
    },
    () => {
      responseError(res, 501);
    }
  );
});

router.delete("/:paymentId", async (req, res) => {
  const paymentId = req.params.paymentId;

  if (!paymentId) return responseError(res, 400);

  await deletePayment({ paymentId }).then(
    ({ deletedCount }) => {
      res.json({ paymentId, deleted: !!deletedCount });
    },
    () => {
      responseError(res, 501);
    }
  );
});

const adminPayments = { router, methods: "" };
export default adminPayments;
