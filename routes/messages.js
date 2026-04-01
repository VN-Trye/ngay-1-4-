let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let messageModel = require('../schemas/messages');
let userModel = require('../schemas/users');
let { CheckLogin } = require('../utils/authHandler');
let { uploadFile } = require('../utils/uploadHandler');

const USER_PUBLIC_FIELDS = 'username email fullName avatarUrl';

function isValidUserID(userID) {
    return mongoose.Types.ObjectId.isValid(userID);
}

async function getActiveUser(userID) {
    return await userModel
        .findOne({
            _id: userID,
            isDeleted: false
        })
        .select(USER_PUBLIC_FIELDS);
}

router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let currentUserID = req.user._id.toString();
        let messages = await messageModel
            .find({
                $or: [
                    { from: req.user._id },
                    { to: req.user._id }
                ]
            })
            .sort({ createdAt: -1 })
            .populate('from', USER_PUBLIC_FIELDS)
            .populate('to', USER_PUBLIC_FIELDS);

        let sentUserIDs = new Set();
        let result = [];

        for (const message of messages) {
            let otherUser = message.from._id.toString() === currentUserID
                ? message.to
                : message.from;
            let otherUserID = otherUser._id.toString();

            if (otherUserID === currentUserID || sentUserIDs.has(otherUserID)) {
                continue;
            }

            sentUserIDs.add(otherUserID);
            result.push({
                user: otherUser,
                lastMessage: message
            });
        }

        res.send(result);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        let userID = req.params.userID;
        if (!isValidUserID(userID)) {
            res.status(404).send({
                message: 'user khong ton tai'
            });
            return;
        }

        let targetUser = await getActiveUser(userID);
        if (!targetUser) {
            res.status(404).send({
                message: 'user khong ton tai'
            });
            return;
        }

        let messages = await messageModel
            .find({
                $or: [
                    {
                        from: req.user._id,
                        to: userID
                    },
                    {
                        from: userID,
                        to: req.user._id
                    }
                ]
            })
            .sort({ createdAt: 1 })
            .populate('from', USER_PUBLIC_FIELDS)
            .populate('to', USER_PUBLIC_FIELDS);

        res.send(messages);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

router.post('/:userID', CheckLogin, uploadFile.single('file'), async function (req, res, next) {
    try {
        let userID = req.params.userID;
        if (!isValidUserID(userID)) {
            res.status(404).send({
                message: 'user khong ton tai'
            });
            return;
        }

        if (req.user._id.toString() === userID) {
            res.status(400).send({
                message: 'khong the gui tin nhan cho chinh minh'
            });
            return;
        }

        let targetUser = await getActiveUser(userID);
        if (!targetUser) {
            res.status(404).send({
                message: 'user khong ton tai'
            });
            return;
        }

        let messageContent;
        if (req.file) {
            messageContent = {
                type: 'file',
                text: `/api/v1/upload/${req.file.filename}`
            };
        } else if (req.body.text && req.body.text.trim()) {
            messageContent = {
                type: 'text',
                text: req.body.text.trim()
            };
        } else {
            res.status(400).send({
                message: 'noi dung tin nhan khong duoc de trong'
            });
            return;
        }

        let newMessage = new messageModel({
            from: req.user._id,
            to: userID,
            messageContent: messageContent
        });

        await newMessage.save();
        await newMessage.populate('from', USER_PUBLIC_FIELDS);
        await newMessage.populate('to', USER_PUBLIC_FIELDS);

        res.send(newMessage);
    } catch (error) {
        res.status(400).send({
            message: error.message
        });
    }
});

module.exports = router;
