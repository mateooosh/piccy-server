module.exports = (app, connection) => {

  //import my functions
  const fun = require('../functions/functions');

  const router = require('express').Router();

  //get post by id
  router.get('/comments/:idPost', (req, res) => {
    let query = `SELECT c.*, u.username, u.photo FROM comments c JOIN users u ON c.idUser=u.id WHERE c.idPost=${req.params.idPost}`;
     
    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err;

        rows.map(item => {
          item.photo = fun.bufferToBase64(item.photo);
        })

        res.json(rows);    
      })
  })

  

  app.use('/', router);
}