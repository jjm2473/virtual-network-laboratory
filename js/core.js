
/**
 * part of https://github.com/jjm2473/virtual-network-laboratory
 */

var VNet = (function(){
var VNet = function(model,nodeMap) {
    this.model = model;
    this.nodeMap = nodeMap;

    this.script = function() {
        var sb = `#!/bin/sh

action=$1

if [ \\( -z "$action" \\) -o \\( "$action" != "create" -a "$action" != "destroy" \\) ]; then
    echo "Usage: $0 { create | destroy }"
    exit 255
fi

if [ "$action" = "create" ]; then
    echo "creating..."
`;

        sb += this.create().replace(/\n/g, `
    `);

        sb += `
else
    echo "destroying..."
`;

        sb += this.destroy().replace(/\n/g, `
    `);

        sb += `
fi
`;

        return sb;
    };

    this.create = function() {
        var sb = '\n# init namespace\n';
        this.model.hosts.forEach(e => {
            sb += 'ip netns add ' + e.name + '\n';
            sb += 'ip netns exec ' + e.name + ' ip link set dev lo up\n';
        });

        sb += '\n# init bridge\n';

        this.model.switches.forEach(e => {
            sb += 'ip link add ' + e.name + ' type bridge\n';
            sb += 'ip link set dev ' + e.name + ' up\n';
        });

        sb += '\n# config link';
        var vethNo = 0;
        this.model.links.forEach(e => {
            sb += '\n# config link pair #' + vethNo + '\n';
            var vethPre = "veth" + vethNo + '.';
            sb += 'ip link add ' + vethPre + '0 type veth peer name ' + vethPre + '1\n';
            [e.from, e.to].forEach((peer,i) => {
                var iface = vethPre + i;
                var ns = null;
                var node = this.nodeMap[peer.peer];
                if (node.type == 'switch') {
                    sb += 'ip link set dev ' + iface + ' master ' + peer.peer;
                    if (typeof peer.if === 'string') {
                        sb += ' name ' + peer.if;
                        iface = peer.if;
                    }
                    sb += '\n';
                } else {
                    if (node.type === 'root') {
                        if (typeof peer.if === 'string') {
                            sb += 'ip link set dev ' + iface + ' name ' + peer.if + '\n';
                            iface = peer.if;
                        }
                    } else {
                        sb += 'ip link set dev ' + iface + ' netns ' + peer.peer;
                        ns = peer.peer;
                        if (typeof peer.if === 'string') {
                            sb += ' name ' + peer.if;
                            iface = peer.if;
                        }
                        sb += '\n';
                    }

                    if (typeof peer.ipv4 === 'string') {
                        if (ns !== null) {
                            sb += 'ip netns exec ' + ns + ' ';
                        }
                        sb += 'ip address add ' + peer.ipv4 + ' dev ' + iface + '\n';
                    }
                }
                if (ns !== null) {
                    sb += 'ip netns exec ' + ns + ' ';
                }
                sb += 'ip link set dev ' + iface + ' up\n';
            });

            ++ vethNo;
        });

        sb += '\n# config route\n';
        this.model.hosts.forEach(e => {
            if (typeof e.gateway === 'string') {
                sb += 'ip netns exec ' + e.name + ' ip route add default via ' + e.gateway + '\n';
            }
        });

        return sb;
    };

    this.destroy = function() {
        sb = '\n# destroy namespace\n';
        this.model.hosts.forEach(e => {
            sb += 'ip netns del ' + e.name + '\n';
        });

        sb += '\n# destroy bridge\n';
        this.model.switches.forEach(e => {
            sb += 'ip link del ' + e.name + '\n';
        });

        return sb;
    };
}

VNet.fromJson = function(json) {
    var net = JSON.parse(json);
    var nodeMap = {};
    net.hosts.forEach(e => {
        e.type = 'host';
        nodeMap[e.name] = e;
    });
    net.switches.forEach(e => {
        e.type = 'switch';
        nodeMap[e.name] = e;
    });
    if (!nodeMap.hasOwnProperty('root')) {
        nodeMap['root'] = {name:'root',type:'root'};
    }
    net.links.forEach(e => {
        [e.from, e.to].forEach(e => {
            if (!nodeMap.hasOwnProperty(e.peer)) {
                throw 'peer '+e.peer+' not defined';
            }
        });
    });

    return new VNet(net, nodeMap);
};

return VNet;
})();

typeof module === 'undefined' || (module.exports = VNet);
