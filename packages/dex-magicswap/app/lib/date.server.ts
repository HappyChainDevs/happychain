import dayjs from "dayjs";

export const getOneDayAgoTimestamp = () =>
  dayjs().startOf("day").subtract(24, "hour").unix();

export const getOneWeekAgoTimestamp = () =>
  dayjs().startOf("day").subtract(7, "day").unix();
