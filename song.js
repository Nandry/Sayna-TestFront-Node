
const mongoose = require('mongoose');
const songSchema = new mongoose.Schema({
    name: {
        type: String,
        maxlength: 50,
        required: true
    },
    url: {
        type: String,
        maxlength: 50,
        required: true
    },
    cover: {
        type: String,
        trim: true,
        unique: 1,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        required: true
    }
   
}, { timestamps: true });

const Song = mongoose.model('Song', songSchema);
module.exports = { Song };