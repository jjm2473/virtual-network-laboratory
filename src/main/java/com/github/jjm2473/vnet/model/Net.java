package com.github.jjm2473.vnet.model;

import java.util.Collections;
import java.util.List;

/**
 * 虚拟网络的配置
 */
public class Net {
    /**
     * 定义主机和/或路由器, 一个主机或者路由器对应一个网络命名空间
     */
    public List<Host> hosts;
    /**
     * 定义交换机, 一个交换机对应一个虚拟bridge设备
     */
    public List<Switch> switches = Collections.emptyList();
    /**
     * 链路, 一条链路相当于一条网线
     */
    public List<Link> links = Collections.emptyList();
}
