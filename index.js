const express = require("express")
const app = express()
const bodyParser = require("body-parser");
const Bcrypt = require("bcryptjs");
const jsonwebtoken = require('jsonwebtoken');

const { User } = require('./user');
const { Carte } = require('./cart');
const { Song } = require('./song');

const SECRET_CODE = "A_secret_kljhuio"
const SECRET_REFRESH_CODE = "A_secret_refresh_lpoiuj"
const TOKEN_LIFE = 3600
const REFRESHTOKEN_LIFE=86000


let port = process.env.PORT || 3000
let nbTentative = 0;


var mongoose = require('mongoose');
//mongoose.Promise = global.Promise;
require('dotenv').config()

mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => console.log("== DB Connected=="))
    .catch(err => console.log("Error on DB connection: " + err))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// request
//1.index
app.get("/", (req, res) => {
    res.status(200).send("<html> <head>server Response</head><body><h1> This page was render direcly from the server <p>Hello there welcome to my website</p></h1></body></html>");
});
// 404

// 2. login
app.post("/login", async (request, response) => {
    try {
        if (request.body.email == "" || request.body.password == "") {
            return response.status(412).send({ "error": true, "message": "Email/password manquants" });
                                        //json
        }
        var user = await User.findOne({ email: request.body.email }).exec();
        if (!user) {
            return response.status(412).send({ "error": true, "message": "Email incorrect" });
        }
        if (!Bcrypt.compareSync(request.body.password, user.password)) {
            nbTentative++
            if (nbTentative >= 5) { return response.status(429).send({ "error": true, "message": "Trop de tentative sur email" + user.email + "Veuillez patienter" }); }
            else return response.status(412).send({ "error": true, "message": "password incorrect" });
        }
        nbTentative = 0
        var token = jsonwebtoken.sign({ id: user._id, email: user.email }, SECRET_CODE, { expiresIn: TOKEN_LIFE })
        var refresh_token = jsonwebtoken.sign({ id: user._id, email: user.email }, SECRET_REFRESH_CODE, { expiresIn: REFRESHTOKEN_LIFE })
        user.token = token
        user.save(function (err) {
            if (err)
                console.log('error on login '+err)
            });
        response.status(200).send({ "error": false, "message": "L'utilisateur a été authentifié succes","user":user,"access_token":token,"refresh_token":refresh_token  });
    } catch (error) {
        console.log("Error Login: "+error);
    }
});

//3. register
app.post("/register", async (request, response) => {
    try {
        if (request.body.firstname == "" || request.body.lastname == "" || request.body.email == "" || request.body.sexe == "" || request.body.password == "" || request.body.date_naissance == "") {
            return response.status(400).send({ "error": true, "message": "Une ou plusieurs données obligatoires sont manquantes" });
        }
        var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        if (!request.body.email.match(validRegex)) { 
          return response.status(409).send({ "error": true, "message": "Une ou plusieurs données obligatoires sont erronées" });
        }
        var usr = await User.findOne({ email: request.body.email }).exec();
        if (usr) {
            return response.status(409).send({ "error": true, "message": "Un compte utilisant cette adresse email est déjà enregistré" });
        }
        request.body.password = Bcrypt.hashSync(request.body.password, 10);
        var user = new User(request.body);
        var result = await user.save();
        response.status(200).send({ "error": false, "message": "L'utilisateur a bien été créé avec succes", "user": result, });
    } catch (error) {
       console.log("Error register: "+error);
    }
});

//4. abonnement
app.put('/subscription', (req, res) => {
    if (!req.headers || !req.headers.authorization) {
        return res.status(403).send({ "error": true, "message": "Vos droit d'acces ne permettent pas d'accéder à la ressource " });
    }
    getUserParToken(req)
        .then((user) => {
            if (req.body.id_carte == "" || req.body.id_carte == "" ) {
                return res.status(400).send({ "error": true, "message": "Une ou plusieurs données obligatoire sont manquantes" });
            }
            if (user.abonnement == 0) {
                user.abonnement = 1
                user.save()
                return res.status(200).send({ "error": false, "message": "Votre periode d'essaie vient d'être activé " });
            }
            else {
                return res.status(200).send({ "error": false, "message": "Votre abonnement a bien été mise à jour " });
            }
           

        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })

})

//5 Modif user
app.put('/user', (req, res) => {
    getUserParToken(req)
        .then((user) => {
            if (Date.parse(req.body.date_naissance) == NaN ) {
                return res.status(409).send({ "error": true, "message": "Un ou plusieurs données erronées" });
            }
            user.firstname = req.body.firstname
            user.lastname = req.body.lastname
            user.date_naissance = req.body.date_naissance
            user.sexe = req.body.sexe
            user.save(function (err) {
                if (err)
                    console.log('error')
                else
                    return res.status(200).send({ "error": false, "message": "Vos données ont été mises a jour" });
            });

        })
        .catch((err) => {
           return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })
    const { email, newEmail } = req.body;
    User.findOneAndUpdate({ email: email }, { $set: { email: newEmail } }, { new: true })
        .then((user) => {
            if (!user) {
                res.status(404).send()
            } else {
                res.send(user)
            }
        }).catch((error) => {
            res.status(400).send() // bad request
        })
});

//6.logout user
app.delete('/user/off', (req, res) => {
    getUserParToken(req)
        .then((user) => {
            var newToken = Math.floor((Math.random() * 1000) + 1);
            user.token = "" + newToken
            user.save()
        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })
});

//7. Ajout carte bancaire
app.put('/user/cart', (req, res) => {
    if (!req.headers || !req.headers.authorization) {
        return res.status(403).send({ "error": true, "message": "Vos droit d'acces ne permettent pas d'accéder à la ressource " });
    }
    getUserParToken(req)
        .then((user) => {
            if (isNaN(req.body.cartNumber) == true || isNaN(req.body.year) == true || isNaN(req.body.month) == true) {
                return res.status(402).send({ "error": true, "message": "Information bancaire incorrecte" });
            }
            var carte = Carte.findOne({ _id: user.carte })
            if (carte) return res.status(409).send({ "error": true, "message": "La carte existe dejà" });
            if (req.body.cartNumber == "" || req.body.month == "" || req.body.year == "" || req.body.default == "" ) {
                return response.status(403).send({ "error": true, "message": "Veuillez completer votre profil avec une carte de credit" });
            }
            // create carte
            var carte2 = new Carte(req.body);
            await carte2.save();
            // update user
            user.carte = carte2._id
            user.save(function (err) {
                if (err)
                    console.log('error')
                else
                    return res.status(200).send({ "error": false, "message": "Vos données ont été mises a jour" });
            });

        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })
    const { email, newEmail } = req.body;
    User.findOneAndUpdate({ email: email }, { $set: { email: newEmail } }, { new: true })
        .then((user) => {
            if (!user) {
                res.status(404).send()
            } else {
                res.send(user)
            }
        }).catch((error) => {
            res.status(400).send() // bad request
        })
});

//8. Suppr compte
app.delete('/user', (req, res) => {
    getUserParToken(req)
        .then((user) => {
          
            // carte
            Carte.deleteOne({_id:user.carte},
                (err, doc) => {
                    if (err) console.log("Error on suppr carte "+err)
                   
                }
            )

            // delete user 
            user.remove(function (err, result) {
                if (err) {
                    console.err("rror on suppr user"+err);
                } else {
                    return res.status(200).send({ "error": false, "message": "Votre compte et le compte de vos enfants ont été supprimés avec succès " });
                }
            });
       
           
        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })
   /* const query = { _id: req.query.email };
    User.deleteOne(query,
        (err, doc) => {
            if (err) return res.json({ success: false, err });
            return res.json({ success: true, doc });
        }
    ) */
});

//9. liste audio
app.get("/songs", (req, res) => {
    if (!req.headers || !req.headers.authorization) {
        return res.status(403).send({ "error": true, "message": "Votre abonnement ne permet pas d'acceder d'accéder à la ressource" });
    }
    getUserParToken(req)
        .then((user) => {
            const songs = await Song.find().limit(5).exec();
            return res.status(200).send({ "error": false, "songs":songs });
        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })
    
});

//10. recuperation 1 audio
app.get("/songs/:id", (req, res) => {
    if (!req.headers || !req.headers.authorization) {
        return res.status(403).send({ "error": true, "message": "Votre abonnement ne permet pas d'acceder d'accéder à la ressource" });
    }
    getUserParToken(req)
        .then((user) => {
            Song.findOne({ _id: req.param('id') })
                .then((song) => {
                    return res.status(200).send({ "error": false, "songs": song });
                })
            
        })
        .catch((err) => {
            return res.status(401).send({ "error": true, "message": "Votre token n'est pas correct" });
        })

});


app.listen(port, () => {
    console.log(`Listening on port $(port)`)
});

function getUserParToken(req) {
    return new Promise((resolve, reject) => {
        if (req.headers && req.headers.authorization) {
            let auth = req.headers.authorization
            let TokenArray = auth.split(" ");
            let decode
            try {
                decode = jsonwebtoken.verify(TokenArray[1], SECRET_CODE)
            }
            catch (e) { reject("Token not valide"); return }
            let userId = decode.id
            User.findOne({ _id: userId })
                .then((user) => {
                    if (user.token == TokenArray[1]) { resolve(user)}
                    else reject("Token erreur")
                })
                .catch((err) => { reject("Token erreur") })
        }
       // else {reject("Pas de token")}
    })
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}