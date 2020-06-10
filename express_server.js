const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

app.use(morgan('dev'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
app.set("view engine", "ejs")

const urlDatabase = {
  "9sm5xK": "http://www.google.com",
  "a2xVn2": "http://www.lighthouselabs.ca"
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
  // .substring(6);
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

// Render the all URLs page
app.get("/urls", (req, res) => {
  // if (req.cookies["user_id"]) {
    let templateVars = {
      urls: urlDatabase,
      // username: req.cookies["username"],
      user: users[req.cookies["user_id"]],
    }
    res.render("urls_index", templateVars);
})

// Render the new URL page
app.get("/urls/new", (req, res) => {
  let templateVars = {
    // username: req.cookies["username"],
    user: users[req.cookies["user_id"]]
  };
  res.render("urls_new", templateVars)
})

// Render the show one URL page
app.get("/urls/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  // const longURL = urlDatabase[req.params.shortURL].startswith('http');
  // Redirect to "urls" if shortURL does not exist
  if (!longURL) {
    return res.redirect("/urls")
  }
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
    // longURL: `http://${urlDatabase[req.params.shortURL]}`,
    // username: req.cookies["username"]
    user: users[req.cookies["user_id"]]
   };
  res.render("urls_show", templateVars);
});

// Link to long URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// Render the registration page
app.get("/registration", (req, res) => {
  res.render("registration")
})

// Render the login page
app.get("/login", (req, res) => {
  res.render("login")
})

// Post a new URL
app.post("/urls", (req, res) => {
  const randomString = generateRandomString()
  urlDatabase[randomString] = req.body.longURL
  res.redirect(`/urls/${randomString}`)
})

// Update existing URL
app.post("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longurl_input
  res.redirect(`/urls/${req.params.shortURL}`)
})

// Delete URL
app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL]
  res.redirect("/urls")
})

// Save the username
app.post("/login", (req, res) => {
  const { email, password } = req.body
  const user = checkForExistingEmail(email)
  const userPassword = checkForMatchingPassword(email, password)
  if (!user) {
    res.status(400).send("Error 403, email does not exist!")
  } else if (!userPassword) {
    res.status(400).send("Error 403, incorrect password!")
  }
  res.cookie('user_id', findUserIdByEmail(email))
  res.redirect("/urls")
})

// Clear user_id cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id')
  res.redirect("/urls")
})

// Add new user object
app.post("/register", (req, res) => {
  const id = generateRandomString()
  const { email, password } = req.body
  const user = checkForExistingEmail(email)
  if (!email || !password) {
    res.status(400).send("Error 400, email or password is empty")
    return
  }
  if (user) {
    res.status(400).send("Error 400, email already exists!")
    return
  }
  users[id] = {
    id,
    email,
    password
  }
  res.cookie("user_id", id)
  res.redirect("/urls")
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});