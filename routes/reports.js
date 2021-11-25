const auth = require("../middleware/token");
module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const auth = require("../middleware/token");

  const router = require('express').Router();

  //  BODY
  // - idReporter
  // - description
  // - attachment
  // report bug
  router.post('/report/bug', auth, (req, res) => {
    const {attachment, idReporter, description} = req.body;
    const attachmentHex = attachment ? fun.base64ToHex(attachment) : 'NULL';

    const query = `INSERT INTO bugs VALUES(NULL, '${idReporter}', NULL, '${description}', 'opened', ${attachmentHex})`;
    connection.query(query, function (err, result) {
      if (err) throw err;
      res.json({message: "Thank You! Bug has been reported"});
    })
  })

  // report post
  router.post('/reports', auth, (req, res) => {
    const {idPost, idReporter, reason} = req.body;

    const query = `INSERT INTO reports VALUES(NULL, ${idPost}, ${idReporter}, NULL, '${reason}', 'new')`;
    connection.query(query, function (err, result) {
      if (err) throw  err;
      res.json({message: 'Post has been reported!'})
    })
  })

  

  app.use('/', router);
}