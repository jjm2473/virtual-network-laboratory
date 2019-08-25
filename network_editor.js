  var init_net_graph = function(cy, toolbar, property) {
    var isContainr = function(node) {
      return node.isParent();
    };
    var uuid = function() {
      return (new Date().getTime()) + '.' + (Math.floor(Math.random()*10000));
    };
    var createTempPort = function(container) {
      var id = 'tmp_' + uuid();
      var p = container.position();
      var w = container.outerWidth();

      var position = {x:p.x + w/2 + 5, y:p.y};
      return {data:{id:id, parent:container.id()}, position:position};
    };
    var addNetNode = function(type) {
      var id = 'node_' + uuid();
      cy.add({data:{id:id, type:type}});
      var hid = id+'-handler';
      cy.add({data:{id:hid, type:'handler', parent:id}, grabbable: false, selectable: false});
      cy.$id(id).select();
      return cy.$id(hid);
    };
    var ehstarted = false;
    var eh = cy.edgehandles({
      preview: false,
      noEdgeEventsInDraw: true,
      handleNodes: 'node:parent, node:parent > node[[degree = 0]][type != "handler"]',
      edgeType: function (sourceNode, targetNode) {
        // can return 'flat' for flat edges between nodes or 'node' for intermediate node between them
        // returning null/undefined means an edge can't be added between the two nodes
        if (ehstarted) {
          if (sourceNode === targetNode || sourceNode.parent() === targetNode) {
            return null;
          }

          if (!isContainr(targetNode) && targetNode.degree() > 0) {
            return null;
          }
        }
        return 'flat';
      },
      handlePosition: function (node) {
        if (node.isParent()) {
          return 'right middle';
        } else {
          return 'middle top';
        }
      }
    });

    var created = null;
    cy.on('ehcancel', (event) => {
      if (created !== null) {
        cy.remove(created);
      }
    });
    cy.on('ehstart', (event, sourceNode) => {
      ehstarted = true;
      if (isContainr(sourceNode)) {
        eh.stop();
        var port = createTempPort(sourceNode);
        port.data.temp = true;
        cy.add(port);
        created = cy.$id(port.data.id);
        eh.start(created);
      }
    });
    cy.on('ehstop', (event) => {
      created = null;
      ehstarted = false;
    });
    cy.on('ehcomplete', (event, sourceNode, targetNode, addedEles) => {
      if (created !== null) {
        created.removeData('temp');
      }
      if (isContainr(targetNode)) {
        var port = createTempPort(targetNode);
        var id = port.data.id;
        cy.add(port);
        targetNode = cy.$id(id);
        var eid = addedEles.id();
        var edge = {data:{id:eid, source:sourceNode.id(), target:id}};
        addedEles.remove();
        cy.add(edge);
        addedEles = cy.$id(eid);
      } else {
        targetNode.removeData('temp');
      }
      sourceNode.select();
      targetNode.select();
      addedEles.select();
    });
    cy.on('grab', (event) => {
      if (!isContainr(event.target)) {
        event.target.ungrabify();
      }
    });

    var nodePropertys = {
        "host":['name', 'gateway'],
        "switch":['name'],
        "port":['name', 'ipv4'],
        "link":[],
        "none":[],
        "other":[]
    };
    var taskId = null;
    var onSelectionChange = function() {
        taskId = null;

        var selected = cy.$(':selected');
        switch (selected.length) {
            case 0:
                property.hide();
            break;
            case 1:
                var ele = selected[0];
                var type = 'none';
                if (ele.isEdge()) {
                    type = 'link';
                } else {
                    type = ele.data('type') || 'port';
                    if (type === 'port') {
                        if (ele.parent().data('type') === 'switch') {
                            type = 'other';
                        }
                    }
                }
                var data = {};
                nodePropertys[type].forEach(k => {
                    data[k] = ele.data(k);
                });
                property.show(type, data);
            break;
            default:
                property.show('other', {});
        }
    };

    cy.on('select unselect', event => {
        if (taskId != null) {
            clearTimeout(taskId);
        }
        taskId = setTimeout(onSelectionChange, 1);
    });

    property.setHandler({
        onUpdate:function(data) {
            var selected = cy.$(':selected');
            if (selected.length !== 1) {
                throw 'illegal state!, can only update one node';
            }
            var ele = selected[0];
            var type = 'none';
            if (ele.isEdge()) {
                type = 'link';
            } else {
                type = ele.data('type') || 'port';
            }
            nodePropertys[type].forEach(k => {
                if (data[k].length > 0) {
                    ele.data(k, data[k]);
                } else {
                    ele.removeData(k);
                }
            });
        },
        onDelete:function() {
            cy.$(':selected').remove();
            property.hide();
        }
    });
    window.cy = cy;

    var newHandler = null;
    toolbar.setHandler({
        start:function(type,event) {
            var h = addNetNode(type);
            newHandler = function(event) {
                h.position(event.position);
            };
            cy.on('mousemove touchmove', newHandler);
        },
        cancel:function(){

        },
        complete:function(){

        },
        stop:function() {
            cy.removeListener('mousemove touchmove', newHandler);
        }
    });
    return eh;
  };

  var commonStyle = [{
        selector: 'node[name]',
        style: {
        'content': 'data(name)'
        }
    },
    {
        selector: 'node:parent',
        style: {
        'padding': '15px',
        'compound-sizing-wrt-labels': 'exclude'
        }
    },
    {
        selector: 'node:parent > node',
        style: {
        'shape': 'polygon',
        'shape-polygon-points': '-0.81 0.5 -0.44 0.5 -0.44 0.69 -0.25 0.69 -0.25 0.81 0.25 0.81 0.25 0.69 0.44 0.69 0.44 0.5 0.81 0.5 0.81 -0.62 -0.81 -0.62 -0.81 0.5'
        }
    },
    {
        selector: 'node[type="handler"]',
        style: {
        'shape': 'tag',
        'events': 'no',
        'z-index-compare': 'manual',
        'z-index': '0'
        }
    },
    {
        selector: 'node:parent[type="switch"] > node[type="handler"]',
        style: {
        'shape': 'polygon',
        'shape-polygon-points': '0.81 -0.44 0.37 0 0.81 0.44 1 0.25 1 1 0.25 1 0.44 0.81 0 0.37 -0.44 0.81 -0.25 1 -1 1 -1 0.25 -0.81 0.44 -0.38 0 -0.81 -0.44 -1 -0.25 -1 -1 -0.25 -1 -0.44 -0.81 0 -0.38 0.44 -0.81 0.25 -1 1 -1 1 -0.25 0.81 -0.44'
        }
    },
    {
        selector: 'node:parent[type="host"] > node[type="handler"]',
        style: {
        'shape': 'polygon',
        'shape-polygon-points': '0.31 1 0.31 0.44 0 0.44 0 1 -0.69 1 -0.69 -0.12 -1 -0.12 0 -1 1 -0.12 0.69 -0.12 0.69 1 0.31 1'
        }
    }];

  var initProperty = function() {
    var container = document.getElementById('property');
    var form = $(document.getElementById('property-form'));
    var handlers = {
        onUpdate:function(data){},
        onDelete:function(){}
    };
    var update = function(){
        var o = {};
        form.serializeArray().forEach(function(item) {
            o[item.name] = item.value || '';
        });
        handlers.onUpdate(o);
    };

    form.find('input').on('blur', update);
    form.find('input').on('keypress', (e)=>{
        if (e.which == 13) {
            update();
        }
    });

    $('#delete').on('click', function() {
        handlers.onDelete();
    });

    return {hide:function() {
        container.className = 'none';
    },show:function(type, data) {
        $.each(data, function(k,v) {
            form.find('input[name="'+k+'"]').val(v);
        });
        container.className = type;
    },setHandler:function(handlers0) {
        handlers = handlers0;
    }};
  };
  var initToolbar = function() {
    var cy = cytoscape({
      container: document.getElementById('toolbar'),

      layout: {
        name: 'preset'
      },

      style: commonStyle,
      zoomingEnabled: false,
      panningEnabled: false,

      elements: [{
        "data": {
          "id": "host",
          "name": "主机/路由器",
          "type": "host"
        },
        "group": "nodes",
        "removed": false,
        "selected": false,
        "selectable": false,
        "locked": false,
        "grabbed": false,
        "grabbable": true,
        "classes": ""
      }, {
        "data": {
          "id": "host-handler",
          "type": "handler",
          "parent": "host"
        },
        "position": {
          "x": 50,
          "y": 60
        },
        "group": "nodes",
        "locked": true,
        "selectable": false,
        "grabbable": false,
      }, {
        "data": {
          "id": "switch",
          "name": "交换机/网桥",
          "type": "switch"
        },
        "group": "nodes",
        "removed": false,
        "selected": false,
        "selectable": false,
        "locked": false,
        "grabbed": false,
        "grabbable": true,
        "classes": ""
      }, {
        "data": {
          "id": "switch-handler",
          "type": "handler",
          "parent": "switch"
        },
        "position": {
          "x": 50,
          "y": 150
        },
        "group": "nodes",
        "locked": true,
        "selectable": false,
        "grabbable": false,
      }]
    });

    var handlers = {
        start:function(type,event){},
        cancel:function(){},
        complete:function(){},
        stop:function(){}
    };

    var tapped = false;
    cy.on('grab', (event) => {
        event.target.ungrabify();
        tapped = false;
        handlers.start && handlers.start(event.target.id(), event.originalEvent);
    });
    cy.on('tap', (event) => {
        tapped = true;
        handlers.cancel && handlers.cancel();
    });
    cy.on('free', (event) => {
        event.target.grabify();
        if (!tapped) {
            handlers.complete && handlers.complete();
        }
        handlers.stop && handlers.stop();
    });

    return {setHandler: function(handlers0) {handlers = handlers0;}};
  };

  var initMenuBar = function(toolbar, property) {
    var cy = null;
    var downloadHelper = document.getElementById('download_helper');
    var uploadHelper = document.getElementById('upload_helper');

    var onFileLoaded = function(data){};

    (function(){

        var asyncCy = null;
        var onFileLoaded0 = function(data) {
            if (cy === asyncCy) {
                onFileLoaded(data);
            }
        };

        uploadHelper.addEventListener('change', function() {
            var file = this.files[0];
            if (file.size > 1024*1024) {
                if (!confirm('你选择的文件超过1MB, 确定要加载?')) {
                    uploadHelper.value = null;
                    return;
                }
            }
            asyncCy = cy;
            var reader = new FileReader();
            reader.addEventListener('loadend', function(){
                uploadHelper.value = null;
                onFileLoaded0(reader.result);
            });
            reader.readAsText(file);
        });
    })();

    var resetView = function() {
        cy.viewport({
            zoom: 1,
            pan: { x: cy.width()/2, y: cy.height()/2 }
        });
    };
    var openGraph = function(elements) {
        if (cy !== null) {
            cy.destroy();
            property.hide();
        }
        cy = importNetwork(elements, toolbar, property).cy;
        if (!elements) {
            resetView();
        }
    };
    var openProject = function(data) {
        openGraph(JSON.parse(data));
    };
    var openBluePrint = function(data) {
        //TODO:
    };
    var downloadBlob = function(blob, name) {
      var url = URL.createObjectURL(blob);
      downloadHelper.href = url;
      downloadHelper.download = name;
      downloadHelper.click();
    };
    var downloadJSON = function(data, name) {
      var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      downloadBlob(blob, name);
    };
    var saveProject = function() {
        cy.$('node.eh-handle').remove();
        downloadJSON(cy.json().elements, 'network.prj.json');
    };
    var unselectAll = function() {
      cy.$(':selected').unselect();
    };
    var graphToBlueprintWrap = function(elements) {
        try {
          return graphToBlueprint(elements);
        } catch (e) {
          if (typeof(e) === 'string') {
            alert(e);
          } else {
            unselectAll();
            cy.$id(e.id).select();
            alert(e.msg);
          }
        }
    };
    var exportBluePrint = function() {
        cy.$('node.eh-handle').remove();
        downloadJSON(graphToBlueprintWrap(cy.json().elements), 'network.json');
    };
    var build = function() {
        cy.$('node.eh-handle').remove();
        var script = VNet.fromJsonObj(graphToBlueprintWrap(cy.json().elements)).script();
        var blob = new Blob([script], {type:'text/x-sh'});
        downloadBlob(blob, 'vnet.sh');
    };
    $('#navbarSupportedContent button.action').on('click', (event) => {
        var callback = null;
        switch (event.currentTarget.value) {
            case 'new':
                if (confirm('将清空当前画布, 是否继续?')) {
                    openGraph(null);
                }
                break;
            case 'open':
                callback = openProject;
            case 'import':
                if (callback === null) {
                    callback = openBluePrint;
                }
                onFileLoaded = callback;
                uploadHelper.click();
                break;
            case 'save':
                saveProject();
                break;
            case 'export':
                exportBluePrint();
                break;
            case 'build':
                build();
                break;
            case 'fit':
                cy.fit();
                break;
            case 'orignal':
                resetView();
                break;

        }
    });

    (function(){
        var searchText = document.getElementById('search_text');
        var searchButton = document.getElementById('search_button');
        var doSearch = function() {
            if (searchText.value) {
                unselectAll();
                cy.$('node[name *= "'+searchText.value+'"]').select();
            }
        };
        searchButton.addEventListener('click', doSearch);
        searchText.addEventListener('keypress', (e)=>{
            if (e.which == 13) {
                doSearch();
            }
        });
    })();
    return {open:openGraph};
  };

  var importNetwork = function(elements, toolbar, property){

    var cy = cytoscape({
      container: document.getElementById('cy'),

      layout: {
        name: 'preset'
      },

      style: commonStyle.concat([
        {
          selector: 'node[temp]',
          style: {
            'border-style': 'dashed',
            'background-opacity': '0.1'
          }
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'width': '2px'
          }
        },

        // some style for the extension
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red',
            'width': 12,
            'height': 12,
            'shape': 'ellipse',
            'overlay-opacity': 0,
            'border-width': 12, // makes the handle easier to hit
            'border-opacity': 0
          }
        },

        {
          selector: '.eh-hover',
          style: {
            'background-color': 'red'
          }
        },

        {
          selector: '.eh-source',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },

        {
          selector: '.eh-target',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },

        {
          selector: '.eh-preview, .eh-ghost-edge',
          style: {
            'background-color': 'red',
            'line-color': 'red',
            'target-arrow-color': 'red',
            'source-arrow-color': 'red'
          }
        },
        {
          selector: '.eh-ghost-edge.eh-preview-active',
          style: {
            'opacity': 0
          }
        }
      ]),

      elements: elements
    });

    var eh = init_net_graph(cy, toolbar, property);
    return {cy:cy, eh:eh};
  };