const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000; // default port 8080
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

app.use(morgan('dev'));

app.set("view engine", "ejs")

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

function generateRandomString() {
  return Math.floor((1 + Math.random()) * 0x100000)
    .toString(16)
};

const checkForExistingEmail = (email) => {
  for (let userKey in users) {
    if (users[userKey].email === email) {
      return true
    }
  }
}

const checkForMatchingPassword = (email, password) => {
  for (let userKey in users) {
    if (users[userKey].email === email) {
      return users[userKey].password === password
    }
  }
}

const findUserIdByEmail = email => {
  for (let userKey in users) {
    if (users[userKey].email === email) {
      return users[userKey].id
    }
  }
}

const urlsForUser = id => {
  const urls = {}
  for (let urlId in urlDatabase) {
    if (urlDatabase[urlId].userID === id) {
      urls[urlId] = urlDatabase[urlId]
    }
  }
  return urls
}

// Home page
app.get("/", (req, res) => {
  res.send("Hello!");
});

// See the object database in the browser
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// /hello example
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// GET - Render the all URLs page
app.get("/urls", (req, res) => {
  if (!req.cookies["user_id"]) {
    console.log("Error 500, You must log in to access the URL!")
    // return res.status(500).send("Error 500, You must log in to access the URL!")
  }
  const urlsById = urlsForUser(req.cookies["user_id"])
  let templateVars = {
    urls: urlsById,
    user: users[req.cookies["user_id"]]
  }
  return res.render("urls_index", templateVars);
})

// GET - Render the new URL page
app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: users[req.cookies["user_id"]]
  };
  if (!req.cookies["user_id"]) {
    return res.redirect("/login")
  }
  return res.render("urls_new", templateVars)
})

// GET - Render the show one URL page
app.get("/urls/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  const urlsById = urlsForUser(req.cookies["user_id"])
  if (!req.cookies["user_id"] || !urlsById[req.params.shortURL]) {
    console.log("Error 500, You must log in to access the URL!")
    // return res.status(500).send("Error 500, You must log in to access the URL!")
  }
  // const longURL = urlDatabase[req.params.shortURL].startswith('http');
  // Redirect to "urls" if shortURL does not exist
  if (!longURL) {
    return res.redirect("/urls")
  }
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    // longURL: `http://${urlDatabase[req.params.shortURL]}`,
    // username: req.cookies["username"]
    user: users[req.cookies["user_id"]]
  };
  return res.render("urls_show", templateVars);
});

// GET - Render the registration page
app.get("/registration", (req, res) => {
  let templateVars = {
    user: users[req.cookies["user_id"]]
  };
  return res.render("registration", templateVars)
})

// GET - Render the login page
app.get("/login", (req, res) => {
  let templateVars = {
    user: users[req.cookies["user_id"]]
  };
  return res.render("login", templateVars)
})

// GET - Link to long URL from short URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  return res.redirect(longURL);
});

// POST - Post a new URL
app.post("/urls", (req, res) => {
  const randomString = generateRandomString()
  urlDatabase[randomString] = {longURL: req.body.longURL, userID: req.cookies["user_id"]}
  return res.redirect(`/urls/${randomString}`)
})

// POST - Edit existing URL
app.post("/urls/:shortURL", (req, res) => {
  const urlsById = urlsForUser(req.cookies["user_id"])
  if (req.cookies["user_id"] && urlsById[req.params.shortURL]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longurl_input
    return res.redirect(`/urls/${req.params.shortURL}`)
  } else {
    return res.status(500).send("Error 500, You must log in to make changes!")
  }
})

// POST - Delete URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const urlsById = urlsForUser(req.cookies["user_id"])
  if (req.cookies["user_id"] && urlsById[req.params.shortURL]) {
    delete urlDatabase[req.params.shortURL]
    return res.redirect("/urls")
  } else {
    return res.status(500).send("Error 500, You must log in to make changes!")
  }
})

// POST - Save the username
app.post("/login", (req, res) => {
  const { email, password } = req.body
  const user = checkForExistingEmail(email)
  const userPassword = checkForMatchingPassword(email, password)

  if (!user) {
    return res.status(403).send("Error 403, email does not exist!")
  }
  if (!userPassword) {
    return res.status(403).send("Error 403, incorrect password!")
  }

  res.cookie('user_id', findUserIdByEmail(email))
  return res.redirect("/urls")
})

// POST - Logout by clearing user_id cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id')
  return res.redirect("/urls")
})

// POST - Add new user object
app.post("/register", (req, res) => {
  const id = generateRandomString()
  const { email, password } = req.body
  const user = checkForExistingEmail(email)
  if (!email || !password) {
    return res.status(403).send("Error 403, email or password is empty")
  }
  if (user) {
    return res.status(403).send("Error 403, email already exists!")
  }
  users[id] = {
    id,
    email,
    password
  }
  res.cookie("user_id", id)
  return res.redirect("/urls")
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});