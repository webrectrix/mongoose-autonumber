'use strict';

const assert = require('chai').assert;
const mongoose = require('mongoose');
const async = require('async');
let connection;
let OrderModel;
let ItemModel;

mongoose.Promise = global.Promise;

before(function (done) {
  mongoose.connection
    .on('error', done)
    .once('open', () => {
      const plugin = require('..');
      let OrderSchema = new mongoose.Schema({
        description: String
      });
      OrderSchema.plugin(plugin, {
        model: 'Order',
        counterField: 'id'
      });
      OrderModel = mongoose.model('Order', OrderSchema);

      let ItemSchema = new mongoose.Schema({
        title: String,
        order: String
      });
      ItemSchema.plugin(plugin, {
        model: 'Item',
        counterField: 'id',
        groupField: 'order'
      });
      ItemModel = mongoose.model('Item', ItemSchema);
      connection = mongoose.connections[0];
      done();
    });
  mongoose.connect('mongodb://127.0.0.1:27017/mongoose-test', {
    useMongoClient: true
  });
});

after(function (done) {
  connection.db.dropDatabase(function (err) {
    if (err) return done(err);
    connection.close(done);
  });
});

afterEach(function (done) {
  async.series([
    function (cb) {
      connection.model('AutoNumber').remove({}, cb);
    },
    function (cb) {
      connection.model('Order').remove({}, cb);
    },
    function (cb) {
      connection.model('Item').remove({}, cb)
    }
  ], done);
});


describe('Mongoose Autonumber', function() {

  it('should increment id on save', function (done) {

    async.series({
      order1: function (cb) {
        let order1 = new OrderModel({ description: 'Some description two' });
        order1.save(cb);
      },
      order2: function (cb) {
        let order2 = new OrderModel({ description: 'Some description two' });
        order2.save(cb);
      }
    }, function (err, results) {
      let order1 = results.order1[0];
      let order2 = results.order2[0];
      assert.notExists(err);
      assert.exists(order1);
      assert.exists(order2);
      assert.propertyVal(order1, 'id', '1');
      assert.propertyVal(order2, 'id', '2');

      done();
    });

  });

  it('should increment id only inside group', function (done) {
    async.series({
      item1: function (cb) {
        let item1 = new ItemModel({title: 'Test item title 1', order: '1'});
        item1.save(cb);
      },
      item2: function (cb) {
        let item2 = new ItemModel({title: 'Test item title 2', order: '1'});
        item2.save(cb);
      },
      item3: function (cb) {
        let item3 = new ItemModel({title: 'Test item title 3', order: '1'});
        item3.save(cb);
      },
      item4: function (cb) {
        let item4 = new ItemModel({title: 'Test item title 4', order: '2'});
        item4.save(cb);
      }
    }, function(err, results) {
      let item1 = results.item1[0];
      let item2 = results.item2[0];
      let item3 = results.item3[0];
      let item4 = results.item4[0];
      assert.notExists(err);
      assert.exists(item1);
      assert.exists(item2);
      assert.exists(item3);
      assert.exists(item4);
      assert.propertyVal(item1, 'id', '1');
      assert.propertyVal(item2, 'id', '2');
      assert.propertyVal(item3, 'id', '3');
      assert.propertyVal(item4, 'id', '1');

      done();
    });
  });


});