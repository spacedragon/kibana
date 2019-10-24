/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import './setup_mocks';
import $ from 'jquery';
import _ from 'lodash';
import ace from 'brace';
import 'brace/mode/json';

import { initializeEditor } from '../../src/input';
const editorInput1 = require('./editor_input1.txt');
const utils = require('../../src/utils');

const aceRange = ace.acequire('ace/range');

describe('Editor', () => {
  let input;

  beforeEach(function () {
    // Set up our document body
    document.body.innerHTML =
      `<div>
        <div id="ConAppEditor" />
        <div id="ConAppEditorActions" />
        <div id="ConCopyAsCurl" />
      </div>`;

    input = initializeEditor(
      $('#ConAppEditor'),
      $('#ConAppEditorActions'),
    );
    input.$el.show();
    input.autocomplete._test.removeChangeListener();
  });
  afterEach(function () {
    input.$el.hide();
    input.autocomplete._test.addChangeListener();
  });

  let testCount = 0;

  const callWithEditorMethod = (editorMethod, fn) => (done) => {
    try {
      input[editorMethod](results => fn(results, done));
    } catch {
      done();
    }
  };

  function utilsTest(name, prefix, data, testToRun) {
    const id = testCount++;
    if (typeof data === 'function') {
      testToRun = data;
      data = null;
    }
    if (data && typeof data !== 'string') {
      data = JSON.stringify(data, null, 3);
    }
    if (data) {
      if (prefix) {
        data = prefix + '\n' + data;
      }
    } else {
      data = prefix;
    }

    test('Utils test ' + id + ' : ' + name, function (done) {
      input.update(data, function () {
        testToRun(done);
      });
    });
  }

  function compareRequest(requests, expected) {
    if (!Array.isArray(requests)) {
      requests = [requests];
      expected = [expected];
    }

    _.each(requests, function (r) {
      delete r.range;
    });
    expect(requests).toEqual(expected);
  }

  const simpleRequest = {
    prefix: 'POST _search',
    data: ['{', '   "query": { "match_all": {} }', '}'].join('\n'),
  };

  const singleLineRequest = {
    prefix: 'POST _search',
    data: '{ "query": { "match_all": {} } }',
  };

  const getRequestNoData = {
    prefix: 'GET _stats',
  };

  const multiDocRequest = {
    prefix: 'POST _bulk',
    data_as_array: [
      '{ "index": { "_index": "index", "_type":"type" } }',
      '{ "field": 1 }',
    ],
  };
  multiDocRequest.data = multiDocRequest.data_as_array.join('\n');

  utilsTest(
    'simple request range',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 3, 1);
      compareRequest(range, expected);
      done();
    })
  );

  utilsTest(
    'simple request data',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'simple request range, prefixed with spaces',
    '   ' + simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 3, 1);
      expect(range).toEqual(expected);
      done();
    })
  );

  utilsTest(
    'simple request data, prefixed with spaces',
    '    ' + simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };

      compareRequest(request, expected);
      done();
    })
  );


  utilsTest(
    'simple request range, suffixed with spaces',
    simpleRequest.prefix + '   ',
    simpleRequest.data + '  ',
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 3, 1);
      compareRequest(range, expected);
      done();
    })
  );

  utilsTest(
    'simple request data, suffixed with spaces',
    simpleRequest.prefix + '    ',
    simpleRequest.data + ' ',
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [simpleRequest.data],
      };

      compareRequest(request, expected);
      done();
    })
  );


  utilsTest(
    'single line request range',
    singleLineRequest.prefix,
    singleLineRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 1, 32);
      compareRequest(range, expected);
      done();
    })
  );

  utilsTest(
    'full url: single line request data',
    'POST https://somehost/_search',
    singleLineRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: 'https://somehost/_search',
        data: [singleLineRequest.data],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'request with no data followed by a new line',
    getRequestNoData.prefix,
    '\n',
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 0, 10);
      compareRequest(range, expected);
      done();
    })
  );

  utilsTest(
    'request with no data followed by a new line (data)',
    getRequestNoData.prefix,
    '\n',
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'GET',
        url: '_stats',
        data: [],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'request with no data',
    getRequestNoData.prefix,
    getRequestNoData.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 0, 10);
      expect(range).toEqual(expected);
      done();
    })
  );

  utilsTest(
    'request with no data (data)',
    getRequestNoData.prefix,
    getRequestNoData.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'GET',
        url: '_stats',
        data: [],
      };
      compareRequest(request, expected);
      done();
    })
  );

  utilsTest(
    'multi doc request range',
    multiDocRequest.prefix,
    multiDocRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 2, 14);
      expect(range).toEqual(expected);
      done();
    })
  );

  utilsTest(
    'multi doc request data',
    multiDocRequest.prefix,
    multiDocRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_bulk',
        data: multiDocRequest.data_as_array,
      };
      compareRequest(request, expected);
      done();
    })
  );

  const scriptRequest = {
    prefix: 'POST _search',
    data: [
      '{',
      '   "query": { "script": """',
      '   some script ',
      '   """}',
      '}',
    ].join('\n'),
  };

  utilsTest(
    'script request range',
    scriptRequest.prefix,
    scriptRequest.data,
    callWithEditorMethod('getRequestRange', (range, done) => {
      const expected = new aceRange.Range(0, 0, 5, 1);
      compareRequest(range, expected);
      done();
    })
  );


  utilsTest(
    'simple request data',
    simpleRequest.prefix,
    simpleRequest.data,
    callWithEditorMethod('getRequest', (request, done) => {
      const expected = {
        method: 'POST',
        url: '_search',
        data: [utils.collapseLiteralStrings(simpleRequest.data)],
      };

      compareRequest(request, expected);
      done();
    })
  );

  function multiReqTest(name, editorInput, range, expected) {
    utilsTest('multi request select - ' + name, editorInput, function (done) {
      input.getRequestsInRange(range, function (requests) {
        // convert to format returned by request.
        _.each(expected, function (req) {
          req.data =
            req.data == null ? [] : [JSON.stringify(req.data, null, 2)];
        });

        compareRequest(requests, expected);
        done();
      });
    });
  }

  multiReqTest(
    'mid body to mid body',
    editorInput1,
    { start: { row: 12 }, end: { row: 17 } },
    [
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
      {
        method: 'PUT',
        url: 'index_1/type1/2',
        data: {
          f: 2,
        },
      },
    ]
  );

  multiReqTest(
    'single request start to end',
    editorInput1,
    { start: { row: 10 }, end: { row: 13 } },
    [
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'start to end, with comment',
    editorInput1,
    { start: { row: 6 }, end: { row: 13 } },
    [
      {
        method: 'GET',
        url: '_stats?level=shards',
        data: null,
      },
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'before start to after end, with comments',
    editorInput1,
    { start: { row: 4 }, end: { row: 14 } },
    [
      {
        method: 'GET',
        url: '_stats?level=shards',
        data: null,
      },
      {
        method: 'PUT',
        url: 'index_1/type1/1',
        data: {
          f: 1,
        },
      },
    ]
  );

  multiReqTest(
    'between requests',
    editorInput1,
    { start: { row: 21 }, end: { row: 22 } },
    []
  );

  multiReqTest(
    'between requests - with comment',
    editorInput1,
    { start: { row: 20 }, end: { row: 22 } },
    []
  );

  multiReqTest(
    'between requests - before comment',
    editorInput1,
    { start: { row: 19 }, end: { row: 22 } },
    []
  );

  function multiReqCopyAsCurlTest(name, editorInput, range, expected) {
    utilsTest('multi request copy as curl - ' + name, editorInput, function (done) {
      input.getRequestsAsCURL(range, function (curl) {
        expect(curl).toEqual(expected);
        done();
      });
    });
  }

  multiReqCopyAsCurlTest(
    'start to end, with comment',
    editorInput1,
    { start: { row: 6 }, end: { row: 13 } },
    `
curl -XGET "http://localhost:9200/_stats?level=shards"

#in between comment

curl -XPUT "http://localhost:9200/index_1/type1/1" -H 'Content-Type: application/json' -d'
{
  "f": 1
}'`.trim()
  );
});
