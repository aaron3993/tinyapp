const bcrypt = require('bcrypt');
const bodyParser = require("body-parser");
const express = require("express");
const morgan = require('morgan');
const PORT = process.env.PORT || 8080;
const app = express();
const cookieSession = require('cookie-session');

app.set("view engine", "ejs");
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['f080ac7b-b838-4c5f-a1f4-b0a9fee10130', 'c3fb18be-448b-4f6e-a377-49373e9b7e1a']
}));

const { generateRandomString, urlsForUser, getUserByEmail } = require('./helpers.js');

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
};

// GET - Render the all URLs page
app.get("/urls", (req, res) => {
  if (!req.session.user_id) {
    console.log("Error 401, You must log in to access the URL!");
    return res.redirect("/login")
    // return res.status(401).send("Error 401, You must log in to access the URL!");
  }
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  let templateVars = {
    urls: urlsById,
    user: users[req.session.user_id]
  };
  return res.render("urls_index", templateVars);
});

// GET - Render the new URL page
app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id]
  };
  if (!req.session.user_id) {
    return res.redirect("/login");
  }
  return res.render("urls_new", templateVars);
});

// GET - Render the show one URL page
app.get("/urls/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  if (!req.session.user_id) {
    return res.status(401).send("Error 401, You must log in to access the URL!");
  }
  if (!urlsById[req.params.shortURL]) {
    return res.status(401).send("Error 401, You can only visit your own URLs!"); 
  }
  if (!longURL) {
    return res.redirect("/urls");
  }
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.session.user_id]
  };
  return res.render("urls_show", templateVars);
});

// GET - Render the registration page
app.get("/registration", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id]
  };
  return res.render("registration", templateVars);
});

// GET - Render the login page
app.get("/login", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id]
  };
  return res.render("login", templateVars);
});

// GET - Link to long URL from short URL
app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(404).send("Error 404, URL does not exist!")
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  return res.redirect(longURL);
});

// POST - Post a new URL
app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  urlDatabase[randomString] = {longURL: req.body.longURL, userID: req.session.user_id};
  return res.redirect(`/urls/${randomString}`);
});

// POST - Edit existing URL
app.post("/urls/:shortURL", (req, res) => {
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  if (req.session.user_id && urlsById[req.params.shortURL]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longurl_input;
    return res.redirect(`/urls/${req.params.shortURL}`);
  } else {
    return res.status(401).send("Error 401, You must log in to make changes!");
  }
});

// POST - Delete URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  if (req.session.user_id && urlsById[req.params.shortURL]) {
    delete urlDatabase[req.params.shortURL];
    return res.redirect("/urls");
  } else {
    return res.status(401).send("Error 401, You must log in to make changes!");
  }
});

// POST - Save the username
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(401).send("Error 401, email does not exist!");
  }
  const userPassword = users[getUserByEmail(email, users)].password;
  let validPassword = bcrypt.compareSync(password, userPassword);
  if (!validPassword) {
    return res.status(401).send("Error 401, email does not exist!");
  }
  req.session.user_id = users[getUserByEmail(email, users)].id;
  return res.redirect("/urls");
});

// POST - Logout by clearing user_id cookie
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  return res.redirect("/urls");
});

// POST - Register new user object
app.post("/register", (req, res) => {
  const id = generateRandomString();
  const { email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = getUserByEmail(email, users);
  if (!email || !hashedPassword) {
    return res.status(401).send("Error 401, email or password is empty");
  }
  if (user) {
    return res.status(401).send("Error 401, email already exists!");
  }
  users[id] = {
    id,
    email,
    password: hashedPassword
  };
  req.session.user_id = id;
  return res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});