const jwt = require("jsonwebtoken");

const useToken = false;

const verifyToken = (req, res, next) => {
  // skip when flag is false
  if(!useToken)
    return next();

  const token = req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    req.user = jwt.verify(token, 'secretKey');
    console.log('decode', jwt.decode(token))
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

module.exports = verifyToken;