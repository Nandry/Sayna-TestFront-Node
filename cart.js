const { User } = require('./user');
const mongoose = require('mongoose');
const carteSchema = new mongoose.Schema({
    cartNumber: {
        type: Number,
        maxlength: 10,
        required: true
    },
    month: {
        type: Number,
        maxlength: 2,
        required: true
    },
    year: {
        type: Number,
        maxlength: 4,
        required: true
    },
    year: {
        type: Number,
        maxlength: 4,
        required: true
    },
    default: {
        type: String,
      
    }
   
   
});

CarteSchema.methods.toJSON = function () {
    var obj = this.toObject();
    delete obj.cvc;
    return obj;
}
const Carte = mongoose.model('Carte', carteSchema);
module.exports = { Carte };