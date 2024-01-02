import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
// import { asyncLocalStorage } from '../../services/als.service.js'
import mongodb from 'mongodb'
const { ObjectId } = mongodb

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection('Reviews')
        var reviews = await collection.aggregate([
            {
                $match: criteria
            },
            {
                $lookup:
                {
                    localField: 'userId',
                    from: 'Users',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup:
                {
                    localField: 'toyId',
                    from: 'Toys',
                    foreignField: '_id',
                    as: 'toy'
                }
            },
            {
                $unwind: '$toy'
            },
            {
                $project: {
                    _id: true,
                    txt: true,
                    user: { _id: true, fullname: true },
                    toy: { _id: true, name: true, price: true },
                }
            }
        ]).toArray()

        if (filterBy.username) {
            const userRegExp = new RegExp(filterBy.username, 'i')
            reviews = reviews.filter(review => userRegExp.test(review.user.fullname))
        }

        if (filterBy.toyname) {
            const ToyRegExp = new RegExp(filterBy.toyname, 'i')
            reviews = reviews.filter(review => ToyRegExp.test(review.toy.name))
        }


        return reviews
    } catch (err) {
        logger.error('cannot find reviews', err)
        throw err
    }

}

async function remove(reviewId) {
    try {
        // const store = asyncLocalStorage.getStore()
        // const { loggedinUser } = store
        const collection = await dbService.getCollection('Reviews')
        // remove only if user is owner/admin
        const criteria = { _id: new ObjectId(reviewId) }
        // if (!loggedinUser.isAdmin) criteria.userId = ObjectId(loggedinUser._id)
        const { deletedCount } = await collection.deleteOne(criteria)
        return deletedCount
    } catch (err) {
        logger.error(`cannot remove review ${reviewId}`, err)
        throw err
    }
}


async function add(review) {
    try {
        const reviewToAdd = {
            userId: new ObjectId(review.userId),
            toyId: new ObjectId(review.toyId),
            txt: review.txt
        }
        const collection = await dbService.getCollection('Reviews')
        await collection.insertOne(reviewToAdd)
        return reviewToAdd
    } catch (err) {
        logger.error('cannot insert review', err)
        throw err
    }
}

function _buildCriteria(filterBy) {
    const criteria = {}
    if (filterBy.userId) criteria.userId = new ObjectId(filterBy.userId)
    if (filterBy.toyId) criteria.toyId = new ObjectId(filterBy.toyId)
    return criteria
}

export const reviewService = {
    query,
    remove,
    add
}


