const express = require('express');
const MongoClient = require('mongodb').MongoClient; 

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require('crypto');

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
    console.log(crypto.createHash('sha512').update('lee146906').digest('base64'))
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
                        pw: crypto.createHash('sha512').update(req.body.pw).digest('base64'),
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

app.post('/login_a', function(req, res){
    res.render('login_a.ejs', {
        id: req.body.id,
        pw: crypto.createHash('sha512').update(req.body.pw).digest('base64')
    })
});

app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(req, res){
    res.render('success.ejs', {
        names: req.body.id
    });
});

function islogin2(req, res, next) {
    if (req.user) {
        res.render('success.ejs', {
            names: req.user.id
        })
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
    db.collection('user').deleteOne({ id: req.user.id }, function (err, result) {
        req.logout()
        res.render('exitsuccess.ejs');
      });
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

app.get('/most-view-post', islogin, function(req, res){
    db.collection('posts').find().toArray(function (err, result) {
        function customSort(a, b) {
            if (a.views == b.views){
                return 0
            }
            return a.views > b.views ? 1 : -1;
        }
        
        var viewsort = result.sort(customSort);
        res.render('most-view.ejs', {
            viewsort: viewsort
        });
    });
});

app.get('/write-post', islogin, function(req, res){
    res.render('write-post.ejs');
});

app.post('/select-book', islogin, function(req, res){
    const a = (String(req.body.new_image_url)).split(' ')
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
        let totalvalue = result.amount;

        db.collection('posts_amount').updateOne(
            { names: '포스트 수' },
            { $inc: { amount: 1 } }
        );

        db.collection('posts').insertOne(
            {
                _id: totalvalue + 1,
                user_name: req.user.id,
                post_title: req.body.booktitle,
                post_desc: req.body.post_desc,
                book_title: req.body.book_title,
                image_url: req.body.image_url,
                views: 0,
                like: 0,
                comment: []
            },
            
            function (err, result) {
                db.collection('user').findOne(
                    {
                        id: req.user.id
                    },

                    function(err, result) {
                        const name = result.name;
                        res.render('reload.ejs');
                    });

                }
            );
        }
    );
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
    db.collection('user').findOne( { id: req.user.id },
        function(err, result) {
            const name = result.name;

            db.collection('posts').find().toArray(function (err, result) {
                var posts = result;
                function customSort(a, b) {
                    if (a.total == b.total){
                        return 0
                    }
                    return a.total > b.total ? 1 : -1;
                }
                
                var viewsort = result.sort(customSort);

                res.render('mypage.ejs', {
                    posts: posts,
                    viewsort: viewsort,
                    name: name,
                });
            });
        }
    );
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
  },
  function (input_id, input_pw, done) {

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
    function (err, result) {
      done(null, result)
    })
}); 

app.get('/:id', function(req, res){
    res.render('unknown.ejs')
});

app.post('/posts/:id', function (req, res) { 
    db.collection('posts').updateOne(
        { _id: Number(req.body.params) }, 
        { $push: { comment: {
            write_user: req.body.write_user,
            comment: req.body.comment
        }}
        }
    )
});

app.get('/posts/:id', function (req, res) {  

    db.collection('posts').updateOne(
        { _id: Number(req.params.id) },
        { $inc: { views: 1 } },
        function (err, result) {
            db.collection('posts').findOne(
                {
                    _id: Number(req.params.id)
                },
            
                function (err, result) {
                    var _id = req.params.id;
                    try {
                        var params = req.params.id;
                        var user_name = result.user_name;
                        var post_title = result.post_title;
                        var post_desc = result.post_desc;
                        var book_title = result.book_title;
                        var image_url = result.image_url;
                        var like = result.like;
                        var views = result.views;
                        var comment = result.comment;
                    }
                    catch(e) {
                        res.render('404.ejs')
                    }

                    res.render('posts-view.ejs', {
                        _id: _id,
                        user_name: user_name,
                        post_title: post_title,
                        post_desc: post_desc,
                        book_title: book_title,
                        image_url: image_url,
                        like: like,
                        params: params,
                        views: views,
                        comment: comment,
                        using_user: req.user.id
                    });
                }
            );  
        }
    );

});

  