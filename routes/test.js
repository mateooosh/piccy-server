module.exports = (app, connection) => {
  const router = require('express').Router();

  // test
  router.post('/test', (req, res) => {
    const query = `INSERT INTO test VALUES(NULL, '${req.body.message}');`;
    connection.query(query, function (err, result) {
      if(err) throw err;
      res.json({message:"Test"}); 
    })
    console.log(req.body.message);
    // res.json({message:"Test"}); 
  })

  // test
  router.get('/test', (req, res) => {
    const query = `SELECT * FROM test`;
    connection.query(query, function (err, result) {
      if(err) throw err;
      res.json(result); 
    })
    // console.log(req.body.message);
    // res.json({message:"Test"}); 
  })

  app.use('/', router);
}