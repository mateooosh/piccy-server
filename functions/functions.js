const bufferToBase64 = photo => {
  // let result = Buffer.from(photo).toString('base64');

  return  `data:image/jpeg;base64,${Buffer.from(photo).toString('base64')}`;
}

const base64ToHex = photo => {
  // const bufferValue = Buffer.from(`${req.body.photo}`,"base64");
  // let photoHex = '0x'+bufferValue.toString('hex');
  
  return `0x${Buffer.from(item, 'base64').toString('hex')}`;
}



module.exports.bufferToBase64 = bufferToBase64;
module.exports.base64ToHex = base64ToHex;