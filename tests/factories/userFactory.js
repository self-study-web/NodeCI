const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = () => {
  // If we wre making use of the google id, we could have geneerated it here
  return new User({}).save();
};
