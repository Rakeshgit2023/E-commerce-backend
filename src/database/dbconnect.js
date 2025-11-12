import mongoose from "mongoose";
export const DbConnect = async () => {
  mongoose
    .connect(process.env.MONGO_URI, {
      dbName: "Chat_Application",
    })
    .then(() => {
      console.log("Database connected successfully");
    })
    .catch((err) => {
      console.log(`some error occured while connecting to database ${err}`);
    });
};
