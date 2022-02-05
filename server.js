const express = require('express');
const MongoClient = require('mongodb').MongoClient; 

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

const app = express();

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 
app.use(express.static('public'));

app.use(express.urlencoded({extended: true})) 
app.set('view engine', 'ejs')

var db;

MongoClient.connect('mongodb+srv://slyram06:lee146906@cluster0.fzore.mongodb.net/Cluster0?retryWrites=true&w=majority', function(err, client) {

  if (err) {
    return console.log(err)
  };

  db = client.db('practice');

  app.listen((process.env.PORT || 8080) , function () {
    console.log('listening on 8080')
  });

});

app.get('/login', islogin2, function(req, res){
    res.render('write.ejs')
});

app.get('/signup', islogin2, function(req, res){
    res.render('signup.ejs')
});

app.post('/signup', function (req, res) {
    if ((req.body.id).length < 6 || (req.body.pw).length < 6) {
        res.render('resignup.ejs')
    }
    db.collection('user').findOne(
        {
          id: req.body.id
        }, 
      
      function(err, result) {
            if (!result) {
                db.collection('user').insertOne(
                    {
                      id: req.body.id,
                      pw: req.body.pw
                    },
            
                    function (err, result) {
                        console.log('1명의 회원가입이 완료되었습니다.')
                        res.render('signupsuccess.ejs')
                    })
            }
            else {
                res.render('signupfail.ejs')
            }
      })
});

app.get('/', islogin2, function(req, res){
    res.render('write.ejs')
});

app.get('/fail', islogin2, function(req, res){
    res.render('fail.ejs')
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(req, res){
    res.render('success.ejs', {
        names: req.body.id
    });
});

function islogin2(req, res, next) {
    if (req.user) {
        next()
    }
    else {
        res.render('already.ejs');
    }
}

app.get('/logout', function(req, res){
    req.logout()
    res.render('logout.ejs');
});

app.get('/mypage', islogin, function(req, res){
    console.log(req.user)
    res.render('mypage.ejs')
});

function islogin(req, res, next) {
    if (req.user) {
        next()
    }
    else {
        res.send('로그인을 안 함')
    }
}
  
passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  }, function (input_id, input_pw, done) {

    console.log(input_id, input_pw);

    db.collection('user').findOne({ id: input_id }, function (err, result) {
      if (err) return done(에러)
  
      if (!result) return done(null, false, { message: '존재하지 않는 아이디입니다.' })
      if (input_pw == result.pw) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비밀번호가 틀렸습니다.' })
      }
    })
}));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});
  
passport.deserializeUser(function (input_id, done) {
    db.collection('user').findOne({ id: input_id }, function (에러, 결과) {
      done(null, 결과)
    })
}); 