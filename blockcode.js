var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var BlockCodeSchema = new Schema({
  js: String,
  xml: String,
  status: String,
  name: String,
  updated: Date
});

var blockcode = mongoose.model('blockcode', BlockCodeSchema);

exports.blockcode = blockcode;