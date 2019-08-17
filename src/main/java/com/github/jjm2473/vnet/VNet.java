package com.github.jjm2473.vnet;

import java.util.HashMap;
import java.util.Map;

import com.alibaba.fastjson.JSON;

import com.github.jjm2473.vnet.model.Link;
import com.github.jjm2473.vnet.model.LinkPeer;
import com.github.jjm2473.vnet.model.Net;
import com.github.jjm2473.vnet.model.Node;
import com.github.jjm2473.vnet.model.Root;
import com.github.jjm2473.vnet.model.Host;
import com.github.jjm2473.vnet.model.Switch;

/**
 * 解析编译蓝图
 */
public class VNet {
    private Net model;
    private Map<String, Node> nodeMap;
    private VNet(Net model, Map<String, Node> nodeMap) {
        this.model = model;
        this.nodeMap = nodeMap;
    }

    /**
     * 编译成shell脚本, 支持创建和销毁操作
     * @return
     */
    public String script() {
        StringBuilder sb = new StringBuilder("#!/bin/sh\n\n");

        sb.append("action=$1\n"
            + "\n"
            + "if [ \\( -z \"$action\" \\) -o \\( \"$action\" != \"create\" -a \"$action\" != \"destroy\" \\) ]; then\n"
            + "\techo \"Usage: $0 { create | destroy }\"\n"
            + "\texit 255\n"
            + "fi\n");

        sb.append("\nif [ \"$action\" = \"create\" ]; then\n"
            + "\techo \"creating...\"\n");

        sb.append(create().replace("\n", "\n\t"));

        sb.append("\nelse\n"
            + "\techo \"destroying...\"\n");

        sb.append(destroy().replace("\n", "\n\t"));

        sb.append("\nfi\n");

        return sb.toString();
    }

    /**
     * 创建操作编译成shell脚本
     * @return
     */
    public String create() {
        StringBuilder sb = new StringBuilder();
        sb.append("\n# init namespace\n");
        for (Host h:model.hosts) {
            sb.append("ip netns add ").append(h.name).append('\n');
            sb.append("ip netns exec ").append(h.name).append(" ip link set dev lo up\n");
        }

        sb.append("\n# init bridge\n");
        for (Switch s:model.switches) {
            sb.append("ip link add ").append(s.name).append(" type bridge\n");
            sb.append("ip link set dev ").append(s.name).append(" up\n");
        }

        sb.append("\n# config link");
        int vethNo = 0;
        for (Link link:model.links) {
            sb.append("\n# config link pair #").append(vethNo).append('\n');
            String vethPre = "veth" + vethNo + ".";
            sb.append("ip link add ").append(vethPre).append("0 type veth peer name ").append(vethPre).append("1\n");
            LinkPeer[] linkPeers = {link.from, link.to};
            for (int i=0;i<linkPeers.length;++i) {
                String iface = vethPre+i;
                String ns = null;
                LinkPeer peer = linkPeers[i];
                Node node = nodeMap.get(peer.peer);
                if (node instanceof Switch) {
                    sb.append("ip link set dev ").append(iface).append(" master ").append(peer.peer);
                    if (peer.iface != null) {
                        sb.append(" name ").append(peer.iface);
                        iface = peer.iface;
                    }
                    sb.append('\n');
                } else {
                    if (node instanceof Root) {
                        if (peer.iface != null) {
                            sb.append("ip link set dev ").append(iface).append(" name ").append(peer.iface).append('\n');
                            iface = peer.iface;
                        }
                    } else {
                        sb.append("ip link set dev ").append(iface).append(" netns ").append(peer.peer);
                        ns = peer.peer;
                        if (peer.iface != null) {
                            sb.append(" name ").append(peer.iface);
                            iface = peer.iface;
                        }
                        sb.append('\n');
                    }

                    if (peer.ipv4 != null) {
                        if (ns != null) {
                            sb.append("ip netns exec ").append(ns).append(" ");
                        }
                        sb.append("ip address add ").append(peer.ipv4).append(" dev ").append(iface).append('\n');
                    }
                }

                if (ns != null) {
                    sb.append("ip netns exec ").append(ns).append(" ");
                }
                sb.append("ip link set dev ").append(iface).append(" up\n");
            }

            ++vethNo;
        }

        sb.append("\n# config route\n");
        for (Host h:model.hosts) {
            if (h.gateway != null) {
                sb.append("ip netns exec ").append(h.name).append(" ip route add default via ").append(h.gateway).append('\n');
            }
        }

        return sb.toString();
    }

    /**
     * 销毁操作编译成shell脚本
     * @return
     */
    public String destroy() {
        StringBuilder sb = new StringBuilder();
        sb.append("\n# destroy namespace\n");
        for (Host h:model.hosts) {
            sb.append("ip netns del ").append(h.name).append('\n');
        }

        sb.append("\n# destroy bridge\n");
        for (Switch s:model.switches) {
            sb.append("ip link del ").append(s.name).append('\n');
        }

        return sb.toString();
    }

    /**
     * 从json中读取蓝图
     * @param json
     * @return
     */
    public static VNet fromJson(String json) {
        Net net = JSON.parseObject(json, Net.class);
        Map<String, Node> nodeMap = new HashMap<String, Node>(net.hosts.size()+net.switches.size());
        for (Host h:net.hosts) {
            nodeMap.put(h.name, h);
        }
        for (Switch s:net.switches) {
            nodeMap.put(s.name, s);
        }
        if (!nodeMap.containsKey(Root.INSTANCE.name)) {
            nodeMap.put(Root.INSTANCE.name, Root.INSTANCE);
        }
        for (Link l:net.links) {
            for (LinkPeer peer:new LinkPeer[]{l.from, l.to}) {
                if (!nodeMap.containsKey(peer.peer)) {
                    throw new IllegalArgumentException("peer "+peer.peer+" not defined");
                }
            }
        }
        return new VNet(net, nodeMap);
    }
}
