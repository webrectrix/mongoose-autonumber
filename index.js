'use strict';

const mongoose = require('mongoose')
const _ = require('lodash')
let IdCounterModel;

try {
  IdCounterModel = mongoose.model('IdCounter')
} catch (exception) {
  if (exception.name === 'MissingSchemaError') {
    let IdCounterSchema = new mongoose.Schema({
      model: { type: String, require: true },
      field: { type: String, require: true },
      count: { type: Number, default: 0 },
      group: { type: String }
    });
    
    IdCounterModel = mongoose.model('IdCounter', IdCounterSchema);
  } else {
    throw exception;
  }
}


module.exports = (schema, options) => {
  options = _.extend({
    startsWith: 0,
    incrementBy: 1
  }, options);

  let fields = {};

  fields[options.counterField] = {
    type: String,
    require: true
  };

  schema.add(fields);

  schema.pre('save', async function(next) {
    let doc = this;

    if (doc.isNew) {

      let queryOptions = {
        model: options.model,
        field: options.counterField
      }

      if (!_.isNil(options.groupField)) {
        queryOptions.group = doc[options.groupField].toString();
      }

      let identityCounter;
      try {
        if (!(await checkIdentityCounter(queryOptions))) {
          identityCounter = await createIdentityCounter(queryOptions, options);
        } else {
          identityCounter = await incrementIdentityCounter(queryOptions, options);
        }

        if (_.isNil(identityCounter)) {
          throw new Error('IdentityCounter is null.');
        }
      } catch (e) {
        return next(e);
      }

      doc[options.counterField] = identityCounter.count;
    }

    next();
  });

};

async function checkIdentityCounter(query) {
  let identityCounter = await IdCounterModel.findOne(query);
  return !_.isNil(identityCounter);
}

function createIdentityCounter(query, options) {
  return IdCounterModel.create(_.extend(query, {count: (options.startsWith + options.incrementBy)}))
}

function incrementIdentityCounter(query, options) {
  return IdCounterModel.findOneAndUpdate(query, {$inc: {count: options.incrementBy}}, {new: true})
}