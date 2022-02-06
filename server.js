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
    if (((req.body.id).length < 6 || (req.body.pw).length < 6)){
        res.render('resignup.ejs', {
            err: '양식에 맞춰 가입해주세요.'
        })
    }
    else if ((req.body.age < 1922) || (req.body.age > 2022)){
        res.render('resignup.ejs', {
            err: '올바른 나이를 입력해주세요.'
        })
    }
    else if (req.body.pw != req.body.pw2) {
        res.render('resignup.ejs', {
            err: '비밀번호가 일치하지 않습니다.'
        })
    }
    else {
        db.collection('user').findOne(
            {
                id: req.body.id
            }, 
        
        function(err, result) {
            if (!result) {
                db.collection('user').insertOne(
                    {
                        id: req.body.id,
                        pw: req.body.pw,
                        name: req.body.name,
                        school: req.body.school,
                        age: req.body.age,
                        dark: false,
                        blacklist: false,
                        write_post: [],
                        like_post: [],
                        like_book: [],
                        write_comment: [],
                        like_comment: []
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

    }
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
        res.render('already.ejs');
    }
    else {
        next()
    }
}

app.get('/logout', function(req, res){
    req.logout()
    res.render('logout.ejs');
});

app.get('/menu', function(req, res){
    res.render('menu.ejs');
});

app.get('/exit', islogin, function(req, res){
    res.render('exit.ejs');
});

app.get('/exitsuccess', islogin, function(req, res){
    res.render('exitsuccess.ejs');
});

app.get('/search', islogin, function(req, res){
    res.render('search.ejs');
});

app.get('/edit', islogin, function(req, res){
    db.collection('user').findOne({ id: req.user.id }, function(err, result) {

        const name = result.name;
        const id = result.id;
        const pw = '';
        const age = result.age;
        const school = result.school;

        for (i = 0; i < pw.length, i ++;) {
            pw += '*'
            console.log('*')
        }

        res.render('edit.ejs', {
            name: name,
            id: id,
            age: age,
            school: school,
            pw: pw
        });
    });
});


app.get('/mypage', islogin, function (req, res) {
    db.collection('user').findOne({ id: req.user.id }, function(err, result) {
        const name = result.name;
        const id = result.id;
        const age = result.age;
        const school = result.school;

        res.render('mypage.ejs', {
            name: name,
            id: id,
            age: age,
            school: school
        });
    });
});

function islogin(req, res, next) {
    if (req.user) {
        next()
    }
    else {
        res.render('404.ejs')
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
      if (err) {
          return done(에러)
      }
      if (!result) return done(null, false, {
          message: '존재하지 않는 아이디입니다.'
        })
      if (input_pw == result.pw) {
        return done(null, result)
      }
      else {
        return done(null, false, {
            message: '비밀번호가 틀렸습니다.'
        })
      }
    })
}));

passport.serializeUser(function (user, done) {
    done(null, user.id)
});
  
passport.deserializeUser(function (input_id, done) {
    db.collection('user').findOne({ id: input_id },
    function (에러, 결과) {
      done(null, 결과)
    })
}); 

app.get('/:id', function(req, res){
    res.render('unknown.ejs')
});
  