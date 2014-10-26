var express = require("express"),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  passportLocal = require("passport-local"),
  cookieParser = require("cookie-parser"),
  session = require("cookie-session"),
  db = require("./models/index"),
  flash = require('connect-flash'),
  app = express();
  var morgan = require('morgan');
  var routeMiddleware = require("./config/routes");

// Middleware for ejs, grabbing HTML and including static files
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}) );

app.use(session( {
  secret: 'thisismysecretkey',
  name: 'chocolate chip',
  // this is in milliseconds
  maxage: 3600000
  })
);

// get passport started
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// prepare our serialize functions
passport.serializeUser(function(user, done){
  console.log("SERIALIZED JUST RAN!");
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  console.log("DESERIALIZED JUST RAN!");
  db.User.find({
      where: {
        id: id
      }
    })
    .done(function(error,user){
      done(error, user);
    });
});

///// INITIAL ROUTING ////// - ALL DONE

app.get('/', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('index');
});

app.get('/signup', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('signup', { username: ""});
});

app.get('/login', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('login', {message: req.flash('loginMessage'), username: ""});
});


////// POST-SIGN UP OR LOG IN ///// - REWIRE
///// HAVE "HOME" LEAD TO 
app.get('/home', routeMiddleware.checkAuthentication, function(req,res){
  res.render("home", {user: req.user});
});

// on submit, create a new users using from values
app.post('/submit', function(req,res){
  db.User.createNewUser(req.body.username, req.body.password, req.body.location,
  function(err){
    res.render("signup", {message: err.message, username: req.body.username});
  },
  function(success){
    res.render("index", {message: success.message});
  });
});

// authenticate users when logging in - no need for req,res passport does this for us
app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));

// LOG OUT
app.get('/logout', function(req,res){
  //req.logout added by passport - delete the user id/session
  req.logout();
  res.redirect('/');
});


/// BELOW NOT DONE ///

//////// AUTHOR ROUTES ///// - need to map out with post routes
//Show
//:id is the newly created id, unique to the author
app.get('/oneironaut/:id/dreams', function(req,res){
  console.log("oneironaut/id/dreams");
//goes to the database to find the Author with the same id. 
//once that is done, it calls a function, checking for error and author
  db.User.find(req.params.id).done(function(err, user){
//if no error, capture author and their posts. once done, calls another function
    user.getPosts().done(function(err, posts){
//if no error, renders the author/show page and 
      res.render('users/index', {allPosts:posts, user:user});
    });
  });
});



/////// POST ROUTES ////// - need to map out correctly

//Index - all dreams
app.get('/dreams', function(req,res){
  db.Post.findAll().done(function(err, posts){
    res.render('posts/index', {allPosts: posts});
  });
});

// New - done
app.get('/dreams/new', function(req, res){
  var id = req.params.id;
  db.User.findAll().done(function (err, posts) {
    res.render("posts/new", {title:"",body:"",id:""});
  });
});







//Create - NOT DONE!!
app.post('/dreams', function(req,res){
  var title = req.body.post.title;
  var body = req.body.post.body;
  var userId = req.params.userId;
  //will this id be the same as a value id from the label?
  //try and see if changing to tag will change it.
  var tag = req.body.post.tag;

  db.Post.create({
    title:title,
    body:body,
    userId: userId,
    // same as above
    tag:tag
  }).done(function(err,success){
    if (err) {
      // still relevant below?
      var errMsg = "title must be at least 6 characters";
      res.render('posts/new',{errMsg:errMsg, userId:userId, title:title, body:body, tag:tag});
    }
    else {
      res.redirect('/oneironaut/' + userId + '/dreams');
    }
  });
});

//Show
app.get('/dreams/:id', function(req,res){
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    res.render('posts/show', {post:post});
  });
}); 

//Edit - done
app.get('/dreams/:id/edit', function(req, res) {
  //find our post by the params id
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    res.render('posts/edit', {post: post});
  });
});

//Update 
app.put('/dreams/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    post.getUser().done(function(err, user){
      console.log(author);
      post.updateAttributes({
      title: req.body.post.title,
      body: req.body.post.body,
      id: req.body.post.id
    }).done(function(err,success){
      if(err) {
        var errMsg = "title must be at least 6 characters";
        res.render('posts/edit',{post: post, errMsg:errMsg});
      }
      else{
        res.redirect('/oneironaut/' + author.id + '/dreams');
      }
     });
    });
  });
});

//Delete - done
app.delete('/dreams/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
      post.destroy().done(function(err,success){
        res.redirect('/posts');
      });
   
  });
});

////// 404 & INITIALIZING THE 3000 ////////

// catch-all for 404 errors
app.get('*', function(req,res){
  res.status(404);
  res.render('404');
});


app.listen(3000, function(){
  console.log("get this party started on port 3000");
});