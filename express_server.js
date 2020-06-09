const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.use(bodyParser.urlencoded({ extended: true }));
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



// app.get("/", (req, res) => {
//   res.send("Hello!");
// });

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase }
  res.render("urls_index", templateVars);
})

app.post("/urls", (req, res) => {
  // console.log(req.body)
  const randomString = generateRandomString()
  urlDatabase[randomString] = req.body.longURL
  console.log(urlDatabase)
  res.redirect(`/urls/${randomString}`)
})

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// app.get("/hello", (req, res) => {
//   res.send("<html><body>Hello <b>World</b></body></html>\n");
// });

app.get("/urls/new", (req, res) => {
  res.render("urls_new")
})

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL] };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  console.log(res.statusCode)
  // if (res.statusCode !== 200) {
  //   console.log('Error')
  // }
  res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});