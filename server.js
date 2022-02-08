const express = require('express');
const MongoClient = require('mongodb').MongoClient; 

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

const axios = require("axios");
const cheerio = require("cheerio");

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

app.get('/most-like-post', islogin, function(req, res){
    db.collection('posts').find().toArray(function (err, result) {
        res.render('most-like-post.ejs', {
            posts: result
        });
    });
});

app.get('/write-post', islogin, function(req, res){
    res.render('write-post.ejs');
});

app.post('/select-book', islogin, function(req, res){
    const a = (String(req.body.new_image_url)).split(' ')
    // console.log(a)
    res.render('select-book.ejs', {
        title: req.body.booktitle,
        image_url: req.body.new_image_url,
        book_title: req.body.new_title,
    });
});

app.post('/add-post', islogin, function(req, res) {
    db.collection('posts_amount').findOne(
        {
          names: '포스트 수'
        }, 
      
      function(err, result) {
        var total = result.amount;

        db.collection('posts').insertOne(
            {
                _id: total + 1,
                user_name: req.user.id,
                post_title: req.body.booktitle,
                post_desc: req.body.post_desc,
                book_title: req.body.book_title,
                book_image: req.body.image_url,
                like: 0,
                comment: []
            },
    
            function (err, result) {
                db.collection('posts_amount').updateOne(
                    { name: '포스트 수' },
                    { $inc: { amount: 1 } },
                    function (err, result) {
                        console.log('업로드 되었습니다.')
                        res.render('most-like-post.ejs');
                    }
                )
            });
      });
});

app.post('/write-post', function(req, res){

    const getHtml = async () => {
        try {
            return await axios.get("https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=All&SearchWord=" + encodeURI(req.body.b_name));
        }
        catch (error) {
             console.error(error);
        }
      };
      
      getHtml()
            .then(html => {
                let ulList = [];
                const $ = cheerio.load(html.data);
                const $bodyList = $("div#keyword_wrap")
                                    .children("table")
                                    .children("tbody")
                                    .children("tr")
                                    .children("td")
                                    .children("form#Myform")

                                    .children("div#Search3_Result")
                                    .children("div.ss_book_box")

                                    .children("table")
                                    .children("tbody")
                                    .children("tr")

            $bodyList.each(function(i, elem) {
                ulList[i] = {

                    title: $(this).find(
                        'td table tbody tr td div.ss_book_list ul li a.bo3 b'
                    ).text(),

                    image_url: $(this).find(
                        'td table tbody tr td div a img.i_cover'
                    ).attr('src'),
            };
        });
      
          const data = ulList.filter(n => n.title);
          return data;
        })
        .then(result => {
            
            let lengths = result.length

            if (result.length < 10) {
                lengths == result.length
            }
            else if (result.length >= 10) {
                lengths == 10
            }

            res.render('find-book.ejs', {
                data: result,
                title: req.body.posttitle,
                b_name: req.body.b_name,
                len: lengths
            });

        });
});

app.get('/edit', islogin, function(req, res){

    db.collection('user').findOne({
        id: req.user.id
    },

    function(err, result) {

        const name = result.name;
        const id = result.id;
        const pw = '';
        const age = result.age;
        const school = result.school;

        for (i = 0; i < (result.pw).length, i ++;) {
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

app.get('/posts/:id', function (req, res) {
    db.collection('posts').findOne(
      {
        _id: Number(req.params.id)
      },
  
      function (err, result) {
        var _id = req.params.id;
        var user_name = result.user_name;
        var post_title = result.post_title;
        var post_desc = result.post_desc;
        var book_title = result.book_title;
        var book_image = result.book_image;
        var like = result.like;
        var comment = result.comment;

        res.render('posts-view.ejs', {
          _id: _id,
          user_name: user_name,
          post_title: post_title,
          post_desc: post_desc,
          book_title: book_title,
          book_image: book_image,
          like: like,
          comment: comment
        });
      });
  });
  