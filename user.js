
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    firstname: {
        type: String,
        maxlength: 50,
        required: true
    },
    lastname: {
        type: String,
        maxlength: 50,
        required: true
    },
    email: {
        type: String,
        trim: true,   
        unique: 1,
        required: true
    },
    password: {
        type: String,
        maxlength: 50,
        required: true
    },
    sexe: {
        type: String,
        maxlength: 08,
        required: true
    },
    date_naisance: {
        type: Date,
        required: true
    },
    token: {
        type: String
       
    },
    carte: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Carte"
    },
    abonnement: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

UserSchema.methods.toJSON = function () {
    var obj = this.toObject();
    delete obj.password;
    delete obj.token;
    delete obj.carte;
    return obj;
}

const User = mongoose.model('User', userSchema);
module.exports = { User };