module.exports = (app, connection) => {

  const router = require('express').Router();

  //get post by id
  router.get('/comments/:idPost', (req, res) => {
    let query = `SELECT c.*, u.username, u.photo FROM comments c JOIN users u ON c.idUser=u.id WHERE c.idPost=${req.params.idPost}`;
     
    connection.query(query, 
      function (err, rows, fields) {
        if(err) throw err;

        rows.map(item => {
          let buff = Buffer.from(item.photo);
          let base64data = buff.toString('base64');  
          item.photo = 'data:image/jpeg;base64,' + base64data;
        })

        res.json(rows);    
      })
  })

  

  app.use('/', router);
}