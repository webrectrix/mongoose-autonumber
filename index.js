'use strict';

const mongoose = require('mongoose')
const _ = require('lodash')
let AutoNumberModel;

try {
  AutoNumberModel = mongoose.model('AutoNumber')
} catch (exception) {
  if (exception.name === 'MissingSchemaError') {
    let AutoNumberSchema = new mongoose.Schema({
      model: { type: String, require: true },
      field: { type: String, require: true },
      count: { type: Number, default: 0 },
      group: { type: String }
    });
    
    AutoNumberModel = mongoose.model('AutoNumber', AutoNumberSchema);
  } else {
    throw exception;
  }
}


module.exports = (schema, options) => {
  options = getOptions(options);

  let fields = {};

  fields[options.counterField] = {
    type: String,
    require: true
  };

  if (options.unique) {
    fields[options.counterField].unique = true;
  }

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

      let counter;
      try {
        if (!(await checkCounter(queryOptions))) {
          counter = await createCounter(queryOptions, options);
        } else {
          counter = await incrementCounter(queryOptions, options);
        }

        if (_.isNil(counter)) {
          throw new Error('Counter is null.');
        }

        counter = getCounter(counter.count, doc, options);
      } catch (e) {
        return next(e);
      }

      doc[options.counterField] = counter;
    }

    next();
  });

};

function getCounter(count, record, options) {
  let prefix = '';
  if (options.prefix) {
    if (options.prefix.type == 'field') {
      if (!_.get(record, options.prefix.value)) {
        throw new Error('Undefined prefix field');
      }

      prefix = _.get(record, options.prefix.value);
    } else if (options.prefix.type == 'string') {
      prefix = options.prefix.value;
    } else {
      throw new Error('Undefined type of prefix.');
    }

    count = prefix + options.prefix.delimiter + count;
  }

  return count;
}

function getOptions(options) {
  let defaultOptions = {
    startsWith: 0,
    incrementBy: 1,
    unique: false
  };

  if (options.prefix) {
    defaultOptions.prefix = {
      type: 'string',
      delimiter: '-',
      value: 'I'
    };
  }

  options = _.extend(defaultOptions, options);

  return options;
}

async function checkCounter(query) {
  let counter = await AutoNumberModel.findOne(query);
  return !_.isNil(counter);
}

function createCounter(query, options) {
  return AutoNumberModel.create(_.extend(query, {count: (options.startsWith + options.incrementBy)}))
}

function incrementCounter(query, options) {
  return AutoNumberModel.findOneAndUpdate(query, {$inc: {count: options.incrementBy}}, {new: true})
}