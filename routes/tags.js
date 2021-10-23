module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();

  // get tags by query
  router.get('/tags', auth, (req, res) => {
    if (req.query.query) {
      const query = `SELECT tag FROM tags WHERE tag LIKE '%${req.query.query}%'`;
      connection.query(query, function (err, rows) {
        if (err) throw err;
        res.json(rows.map(item => item.tag));
      })
    } else {
      const query = `SELECT * FROM tags`;
      connection.query(query, function (err, rows) {
        if (err) throw err;
        res.json(rows.map(item => item.tag));
      })
    }
  })

  // get posts by tags
  router.get('/tag/posts', auth, (req, res) => {
    const tag = req.query.tag
    const query = `SELECT photo, description, id FROM posts WHERE description LIKE '%${tag}%'`
    connection.query(query, (err, rows) => {
      if (err) throw err;
      for (let item of rows) {
        if (item.photo) {
          item.photo = fun.bufferToBase64(item.photo);
        }
      }
      res.json(rows);
    })
  })

  app.use('/', router);
}