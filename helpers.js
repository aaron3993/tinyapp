const generateRandomString = () => {
  return Math.floor((1 + Math.random()) * 0x100000)
    .toString(16)
};

const getUserByEmail = function(email, database) {
  for (let userKey in database) {
    if (database[userKey].email === email) {
      return userKey
    }
  }
};

const urlsForUser = (id, database) => {
  const urls = {}
  for (let urlId in database) {
    if (database[urlId].userID === id) {
      urls[urlId] = database[urlId]
    }
  }
  return urls
}

module.exports = { generateRandomString, getUserByEmail, urlsForUser } 