const bcrypt = require('bcrypt');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session');
const express = require("express");
const methodOverride = require('method-override')
const morgan = require('morgan');

const PORT = process.env.PORT || 8080;

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

const urlDatabase = {
  // b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  // i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = {
// "userRandomID": {
  //   id: "userRandomID",
  //   email: "user@example.com",
  //   password: "purple-monkey-dinosaur"
  // },
  // "user2RandomID": {
    //   id: "user2RandomID",
    //   email: "user2@example.com",
    //   password: "dishwasher-funk"
    // }
  };
    
// Visitor cookies object
const visitors = {
  count: 0,
  uniqueVisitors: [],
  timestamp: []
}

const { generateRandomString, urlsForUser, getUserByEmail } = require('./helpers.js');

// GET - Render the list of URLs page
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
    console.log("Error 401, You must log in to access the URL!");
    return res.redirect("/login")
    // return res.status(401).send("Error 401, You must log in to access the URL!");
    // I wanted to print this message but if I were to log out, it would give me the error right away, giving it an awkward feel
  }

  const urlsById = urlsForUser(req.session.user_id, urlDatabase);
  let templateVars = {
    urls: urlsById,
    user: users[req.session.user_id]
  };
  return res.render("urls_index", templateVars);
});

// GET - Render a new URL page
app.get("/urls/new", (req, res) => {
  let templateVars = {
    user: users[req.session.user_id]
  };

  if (!req.session.user_id) {
    return res.redirect("/login");
  }

  return res.render("urls_new", templateVars);
});

// GET - Render the edit a URL page (show)
app.get("/urls/:shortURL", (req, res) => {
  // urlDatabase[req.params.shortURL]
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
console.log('timestamp: ', req.cookies['timestamp'])
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    user: users[req.session.user_id],
    count: req.cookies["visited"],
    visitors: req.cookies["visitors"],
    timestamp: req.cookies["timestamp"]
    // userId: req.cookies["userId"]
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

  urlDatabase.timestamp = []
  const id = generateRandomString()
  // Check if visitor is logged in and has existing cookie, if not, create one for them
  if (!req.session.user_id) {
    req.session.user_id = id;
  }
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(404).send("Error 404, URL does not exist!")
  }

  // Cookies
  visitors.count++
  if (!visitors.uniqueVisitors.includes(req.session.user_id)) {
    visitors.uniqueVisitors.push(req.session.user_id)
  }
  visitors.timestamp.push({'date': new Date(Date.now().toLocaleString('en-GB', { timeZone: 'UTC' })), 'id': req.session.user_id})
  // const timestampArr = []
  // for (const obj of visitors.timestamp) {
  //   timestampArr.push(obj.date, obj.id)
  // }
  const timestampArr = []
  for (const obj of visitors.timestamp) {
    timestampArr.push(obj.date, obj.id)
  }
  // console.log(timestampArr)
  // <% for (let i = 0; i < timestamp.length; i++) { %>
  //   <% if (i % 2) { %>
  //     <p>User: <%= timestamp[i] %></p>
  //   <% } else { %>
  //     <p>Visited times: <%= timestamp[i] %></p>
  //   <% } %>
  // <% } %>
  
  
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.cookie("visitors", visitors.uniqueVisitors.length)
  res.cookie("visited", visitors.count);
  res.cookie("timestamp", timestampArr)
  // res.cookie('userId', timestamp.id);
  // res.cookie('date', JSON.stringify(timestamp).date);
  res.redirect(longURL);
  return
});

// POST - Post a new URL
app.post("/urls", (req, res) => {
  const randomString = generateRandomString();
  urlDatabase[randomString] = {longURL: req.body.longURL, userID: req.session.user_id};
  return res.redirect(`/urls/${randomString}`);
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
  req.session.user_id = null;
  return res.redirect("/urls");
});

// Listen to port number
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});