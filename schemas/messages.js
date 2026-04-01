const mongoose = require('mongoose');

let messageContentSchema = mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['file', 'text'],
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        _id: false
    }
);

let messageSchema = mongoose.Schema(
    {
        from: {
            type: mongoose.Types.ObjectId,
            ref: 'user',
            required: true
        },
        to: {
            type: mongoose.Types.ObjectId,
            ref: 'user',
            required: true
        },
        messageContent: {
            type: messageContentSchema,
            required: true
        }
    },
    {
        timestamps: true
    }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });
messageSchema.index({ to: 1, from: 1, createdAt: -1 });

module.exports = mongoose.model('message', messageSchema);
