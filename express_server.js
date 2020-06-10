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

function generateRandomString() {
  return 'x' + Math.floor((1 + Math.random()) * 0x100000)
    .toString(16)
  // .substring(6);
};

const urlDatabase = {
  "9sm5xK": "http://www.google.com",
  "a2xVn2": "http://www.lighthouselabs.ca"
};

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
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  }
  console.log(req.cookies)
  res.render("urls_index", templateVars);
})

// Render the new URL page
app.get("/urls/new", (req, res) => {
  let templateVars = {
    username: req.cookies["username"],
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
    username: req.cookies["username"]
   };
  res.render("urls_show", templateVars);
});

// Render the registration page
app.get("/registration", (req, res) => {
  res.render("registration")
})

// Link to long URL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

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
  res.cookie('username', req.body.username)
  res.redirect("/urls")
})

// Clear username cookie
app.post("/logout", (req, res) => {
  res.clearCookie('username')
  res.redirect("/urls")
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});