const jwt = require("jsonwebtoken");

const useToken = true;

const verifyToken = (req, res, next, neededRole = 'USER') => {
  // skip when flag is false
  if(!useToken)
    return next();

  const token = req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.sendStatus(403)
  }
  try {
    req.user = jwt.verify(token, 'secretKey');

    if(jwt.decode(token)?.role !== 'ADMIN' && neededRole === 'ADMIN') {
      return res.sendStatus(404)
    }

  } catch (err) {
    req.io.emit(`invalid-token-${jwt.decode(token)?.id}`, {
      code: 'INVALID_TOKEN',
      message: 'Invalid token.'
    })
    return res.sendStatus(405)
  }
  return next();
};

module.exports = verifyToken;