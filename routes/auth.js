const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = (app, connection) => {
  const router = require('express').Router();

  //log in
  router.post('/auth', (req, res) => {
    const query = `SELECT password, id, username from USERS WHERE username='${req.body.username}'`;
    connection.query(query, function (err, rows, fields) {
      if (err) throw err;

      //compare passwords and send response
      if (rows.length > 0) {
        bcrypt.compare(req.body.password, rows[0].password, function (err, result) {
          if (err) throw err;
          if (result) {
            //generate token
            const accessToken = jwt.sign({id: rows[0].id}, 'secretKey', {expiresIn: 86400})
            res.json({
              message: 'Logged successfully',
              id: rows[0].id,
              username: rows[0].username,
              token: accessToken
            });
          } //
          else
            res.sendStatus(401);
        });
      } //
      else
        res.sendStatus(401);
    })
  });

  app.use('/', router);
}