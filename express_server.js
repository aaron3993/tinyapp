const PORT = process.env.PORT || 8080;

const bcrypt = require('bcrypt');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session');
const express = require("express");
const methodOverride = require('method-override')
const morgan = require('morgan');

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(cookieSession({
  name: 'session',
  keys: ['f080ac7b-b838-4c5f-a1f4-b0a9fee10130', 'c3fb18be-448b-4f6e-a377-49373e9b7e1a']
}));
app.use(methodOverride('_method'))
app.use(morgan('dev'));

const urlDatabase = {};

const users = {};

const { generateRandomId, urlsForUser, getUserByEmail } = require('./helpers.js');

// GET - Render the home page, which lists all URLs by all users
app.get("/", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    urls: urlDatabase,
    user: users[req.session.user_id]
  };
  return res.render("home", templateVars);
})

// GET - Render the list of URLs page
app.get("/urls", (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/login")
    // return res.status(401).send("Error 401, You must log in to access the URL!");
    // I wanted to print this above message but if I were to log out, it would give me the error right away, giving it an awkward feel
  }

  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  let templateVars = {
    urls: urlsById,
    user: users[req.session.user_id],
    visitors: req.cookies["uniqueVisitors"],
  };
  return res.render("urls_index", templateVars);
});

// GET - Render a new URL page
app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    return res.redirect("/login");
  }

  let templateVars = {
    user: users[req.session.user_id]
  };

  return res.render("urls_new", templateVars);
});

// GET - Render the edit a URL page (show)
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
    user: users[req.session.user_id],
    visitors: req.cookies["uniqueVisitors"],
    url: urlDatabase[req.params.shortURL]
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

  // Increment visitor count
  urlDatabase[req.params.shortURL].count++
  // Check if visitor is logged in and has existing cookie, if not, create one for them
  if (!req.session.user_id) {
    const id = generateRandomId();
    req.session.user_id = id
  }
  // If visitor is not already in the unique visitors list, push them on
  if (!urlDatabase[req.params.shortURL].uniqueVisitors.includes(req.session.user_id)) {
    urlDatabase[req.params.shortURL].uniqueVisitors.push(req.session.user_id)
  }
  // Push a new date and userId upon visit
  const currentTime = new Date().toLocaleString("en-US", {timeZone: "Canada/Eastern"});
  urlDatabase[req.params.shortURL].timestamp.push(req.session.user_id, currentTime)

  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.cookie("uniquevisitors", urlDatabase[req.params.shortURL].uniqueVisitors)
  res.redirect(longURL);
  return
});

// POST - Post a new URL
app.post("/urls", (req, res) => {
  const randomId = generateRandomId();
  const currentTime = new Date().toDateString()
  // Create the object for every new URL
  urlDatabase[randomId] = {
    longURL: req.body.longURL,
    userID: req.session.user_id,
    count: 0,
    uniqueVisitors: [],
    dateCreated: currentTime,
    timestamp: []
  };

  return res.redirect(`/urls/${randomId}`);
});

// PUT - Edit existing URL
app.put("/urls/:shortURL", (req, res) => {
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);

  if (req.session.user_id && urlsById[req.params.shortURL]) {
    urlDatabase[req.params.shortURL].longURL = req.body.longurl_input;
    return res.redirect(`/urls/${req.params.shortURL}`);
  } else {
    return res.status(401).send("Error 401, You must log in to make changes!");
  }
});

// DELETE - Delete URL
app.delete("/urls/:shortURL/delete", (req, res) => {
  const urlsById = urlsForUser(req.session.user_id, urlDatabase);

  if (req.session.user_id && urlsById[req.params.shortURL]) {
    delete urlDatabase[req.params.shortURL];
    return res.redirect("/urls");
  } else {
    return res.status(401).send("Error 401, You must log in to make changes!");
  }
});

// POST - Register new user object
app.post("/register", (req, res) => {
  const id = generateRandomId();
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

// POST - Login to existing user object
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
  delete req.session.user_id
  return res.redirect("/urls");
});

// Listen to port number
app.listen(process.env.PORT || PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});