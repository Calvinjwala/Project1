var express = require("express"),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  passportLocal = require("passport-local"),
  cookieParser = require("cookie-parser"),
  session = require("cookie-session"),
  db = require("./models/index"),
  flash = require('connect-flash'),
  methodOverride = require('method-override'),
  app = express();
  var morgan = require('morgan');
  var routeMiddleware = require("./config/routes");
  var geocoderProvider = 'google';
  var httpAdapter = 'http';
  var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter);

// Middleware for ejs, grabbing HTML and including static files
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}) );
app.use(methodOverride('_method'));

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



////// POST-SIGN UP OR LOG IN ///// - DONE
app.get('/home', routeMiddleware.checkAuthentication, function(req,res){
  res.render("home", {user: req.user});
});

// on submit, create a new users using from values - DONE
app.post('/submit', function(req,res){
  //API Request to turn zip into geocode
  geocoder.geocode(req.body.location, function(err, longlat) {
    console.log(longlat);
    if (longlat) {
      var zipCode = (longlat[0].longitude + ', ' + longlat[0].latitude);
      db.User.createNewUser(req.body.username, req.body.password, zipCode,
        function(err){
          res.render("signup", {message: err.message, username: req.body.username});
        },
        function(success){
          res.render("index", {message: success.message});
        }
      );
    }
  });
});

// authenticate users when logging in - no need for req,res passport does this for us -done
app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));

// LOG OUT - DONE
app.get('/logout', function(req,res){
  //req.logout added by passport - delete the user id/session
  req.logout();
  res.redirect('/');
});


/////// POST ROUTES ////// - need to map out correctly

//Index - all dreams - done
app.get('/dreams', function(req,res){
  db.Post.findAll({include: [db.User]}).done(function(err, posts){
    res.render('posts/index', {allPosts:posts});
  });
});

// New - done
app.get('/dreams/new', function(req, res){
  db.User.findAll().done(function (err, posts) {
    res.render("posts/new", {title:"",body:"",id:"", tag:""});
  });
});


//Create - DONE!! posts to all dreams
app.post('/dreams', function(req,res){
  var title = req.body.post.title;
  var body = req.body.post.body;
  var UserId = req.user.id;
  var tag = req.body.post.tag;
  var username = req.user.username;
  var priv = req.body.post.priv;

  if(req.body.post.priv === 'on'){
    priv = true;
  }
  else {
    priv = false;
  }

  console.log(priv);

  db.Post.create({
    title:title,
    body:body,
    UserId: UserId,
    tag:tag,
    priv:priv
  }).done(function(err,success){
    if (err) {
      // still relevant below?
      var errMsg = "title must be at least 6 characters";
      res.render('posts/new');
    }
    else {
      res.redirect('/dreams');
    }
  });
});

//Show DREAMS of specific users- done
app.get('/oneironaut/:id/dreams', function(req,res){
  var id = req.params.id;
  if (Number(id) === req.user.id) {
    res.redirect('/my_dreams');
  }
  db.User.find(id).done(function(err,user){
    user.getPosts().done(function(err,post){
      res.render('posts/show', {allPosts:post, user:user});
      console.log(db.User);
      });
  });
}); 

//// USER ROUTES ////

//Show MY DREAMS - kind of done
app.get('/my_dreams', function(req,res){
  db.User.find(req.user.id).done(function(err, user){
    user.getPosts().done(function(err, post){
    res.render('users/index', {allPosts:post, user:req.user});
    });
  });
});

// Edit - done
app.get('/my_dreams/:id/edit', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    res.render('posts/edit', {post: post});
  });
});

//Update
app.put('/my_dreams/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    post.getUser().done(function(err,user){
      console.log(user);
      post.updateAttributes({
      title: req.body.post.title,
      body: req.body.post.body,
      tag: req.body.post.tag
    }).done(function(err,success){
      if(err) {
        var errMsg = "title must be at least 6 characters";
        res.render('posts/edit',{post: post, errMsg:errMsg});
      }
      else{
        res.redirect('/my_dreams');
      }
     });
    });
  });
});

//Delete
app.delete('/my_dreams/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
      post.destroy().done(function(err,success){
        res.redirect('/my_dreams');
    });
  });
});


///// THE MAP //////

//Map
app.get('/map', function(req,res){
  db.User.findAll().done(function(err, users){
    var coords = users.map(function (user) {
      return {name: user.username, loc: user.location, id:user.id};
    });
    res.render('map', {userInfo: JSON.stringify(coords)});
  });
});



////// 404 & INITIALIZING THE 3000 ////////

// catch-all for 404 errors
app.get('*', function(req,res){
  res.status(404);
  res.render('404');
});


app.listen(process.env.PORT || 3000, function(){
  console.log("get this party started on port 3000");
});