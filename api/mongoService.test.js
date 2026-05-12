const test = require('node:test');
const assert = require('node:assert/strict');

const mongoService = require('./mongoService');

const originalConnect = mongoService.connect;
const originalCollection = mongoService.collection;

const createFindStub = (captured) => ({
    find(query) {
        captured.query = query;
        return {
            sort(sortArg) {
                captured.sort = sortArg;
                return {
                    limit(limitArg) {
                        captured.limit = limitArg;
                        return {
                            toArray: async () => []
                        };
                    }
                };
            }
        };
    }
});

test.afterEach(() => {
    mongoService.connect = originalConnect;
    mongoService.collection = originalCollection;
});

test('advancedSearch treats q as literal text in Mongo regex filters', async () => {
    const captured = {};
    mongoService.connect = async () => {};
    mongoService.collection = createFindStub(captured);

    await mongoService.advancedSearch({ q: 'a(b+)+$' }, 10);

    const textCondition = captured.query.$and[0].$or;
    assert.equal(textCondition[0].title.$regex, 'a\\(b\\+\\)\\+\\$');
    assert.equal(textCondition[1].artist.$regex, 'a\\(b\\+\\)\\+\\$');
});

test('searchSongs treats search text as literal text in all regex filters', async () => {
    const captured = {};
    mongoService.connect = async () => {};
    mongoService.collection = createFindStub(captured);

    await mongoService.searchSongs('(track|artist).*');

    const searchConditions = captured.query.$or;
    assert.equal(searchConditions[0].title.$regex, '\\(track\\|artist\\)\\.\\*');
    assert.equal(searchConditions[1].artist.$regex, '\\(track\\|artist\\)\\.\\*');
    assert.equal(searchConditions[2].genre.$regex, '\\(track\\|artist\\)\\.\\*');
});
