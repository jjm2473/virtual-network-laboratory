
var graphToBlueprint = (function(){
    var graphToBlueprint = function(elements) {
        var hosts = [];
        var switches = [];
        var hostMap = {};
        var switchMap = {};
        var portMap = {};
        elements.nodes && elements.nodes.forEach(node => {
            switch (node.data.type) {
                case 'host':
                    hostMap[node.data.id] = node.data;
                    var o = {};
                    ['name', 'gateway'].forEach(k=>{
                        o[k] = node.data[k];
                    });
                    if (!o.name) {
                        throw {id:node.data.id, msg:'name empty'};
                    }
                    if (o.name !== 'root') {
                        hosts.push(o);
                    }
                    break;
                case 'switch':
                    switchMap[node.data.id] = node.data;
                    var o = {name:node.data.name};
                    if (!o.name) {
                        throw {id:node.data.id, msg:'name empty'};
                    }
                    switches.push(o);
                    break;
                case 'handler':
                    break;
                default:
                    portMap[node.data.id] = node.data;
            }
        });

        var links = [];

        elements.edges && elements.edges.forEach(edge => {
            var peers = [edge.data.source, edge.data.target];
            var peers2 = [null, null];
            for (var i=0;i<peers.length;++i) {
                var port = portMap[peers[i]];
                var peer = {if:port.name, ipv4:port.ipv4};
                peer.peer = (hostMap[port.parent] || switchMap[port.parent]).name;
                peers2[i] = peer;
            }
            links.push({from:peers2[0],to:peers2[1]});
        });

        return {hosts: hosts, switches:switches, links:links};
    };
    return graphToBlueprint;
})();

typeof module === 'undefined' || (module.exports = graphToBlueprint);