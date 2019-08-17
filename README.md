# Virtual Network Laboratory

基于Linux网络命名空间的虚拟网络实验室, 
可根据[蓝图](#蓝图)创建一个虚拟的网络.

### 常规工作流
1. 首先根据需求编写[蓝图](#蓝图)文件, 假设保存到`blueprint.json`
2. 把蓝图编译成shell脚本([下载vnet-lab.jar](https://github.com/jjm2473/virtual-network-laboratory/releases)):
    ```shell script
    java -jar vnet-lab.jar blueprint.json > network.sh && chmod 755 network.sh
    ```
3. 创建虚拟网络:
    ```shell script
    sudo ./network.sh create
    ```
4. 创建虚拟网络之后, 即可进入各个Host(即命名空间)进行网络实验, 
    为了方便进入不同Host, 提供了脚本 [scripts/netenter](scripts/netenter),
    假设要进入`pc1`, 执行:
    ```shell script
    ./scripts/netenter pc1
    ```
    `netenter`还能直接在指定的Host执行指定的命令, 例如在`pc1`执行`ping 8.8.8.8`:
    ```shell script
    ./scripts/netenter pc1 ping 8.8.8.8
    ```
5. 销毁虚拟网络(或者直接重启机器):
    ```shell script
    sudo ./network.sh destory
    ```

### 蓝图
[蓝图示例](docs/example.json)

蓝图中有三种角色, 分别是:

1. 主机(hosts)
   > 主机对应Linux中一个网络命名空间, 主机同时也可能是路由器, 看你怎么配置.
     主机有两个属性: 
   1. name: 主机的名称, 即命名空间的名称, 不可重复
   2. gateway: 默认网关, 可不指定 
2. 交换机(switches)
   > 交换机对应一个虚拟bridge设备, 交换机只要一个属性:
   1. name: 交换机的名称, 不可重复
3. 链路(links)
   > 链路对应一对veth设备, 相当于网线, 用于连接主机或者交换机.
    链路有两个成员, 分别是from 和 to, 代表连接的两个节点, 不分先后,
    from 和 to各有三个属性:
   1. peer: 主机或者交换机节点的名称
   2. if: 此端口在节点中的接口名称, 可以不指定, 建议交换机节点别配置, 以免重名
   3. ipv4: 配置此端口的ipv4地址, 可以不指定, 连接到交换机的端口忽略此参数

需要注意的是交换机和连接到交换机的端口都在宿主机的根命名空间里, 所以交换机的名称不能重复, 
连接到所有交换机的所有端口的接口名称也不能重复.

### 案例
要实现的网络拓扑:
```text
            宿主机
              |
            路由器(router1)
            /   \
      交换机1     交换机2
       /   \     /   \
     pc1  pc2  pc3   pc4
```
~ ___宿主机___ 即当前运行Linux的机器, 蓝图中用`root`表示;

~ ___路由器___ 并非现代意义上的路由器, 而是一台普通的主机, 跟 ___交换机1___ 和 ___交换机2___ 合在一起更像是现代的路由器; 

此网络拓扑对应的蓝图文件是 [docs/example.json](docs/example.json).

最终要实现的是pc之间互通, pc可以连接外网.

编译蓝图:
```shell script
java -jar vnet-lab.jar docs/example.json > example.sh && chmod 755 example.sh
```
之后的命令都在Linux上执行;

创建虚拟网络:
```shell script
sudo ./example.sh create
```
创建完之后可以执行`ip netns`查看有哪些主机, 这个案例中会输出:
```text
pc4 (id: 3)
pc3 (id: 2)
pc2 (id: 1)
pc1 (id: 0)
router1 (id: 4)
```

#### pc之间的连通
在`pc1`中ping `pc2`:
```shell script
./scripts/netenter pc1 ping 192.168.65.2
```
`pc1`和`pc2`在同一个交换机下, 可以ping通;

再试试ping `pc3`:
```shell script
./scripts/netenter pc1 ping 192.168.66.1
```
这个时候能不能ping通取决于router1上的路由转发有没有打开:
```shell script
./scripts/netenter router1 cat /proc/sys/net/ipv4/ip_forward
```
如果输出1, 说明路由转发已经打开, 那前面的ping应该也是成功的;
如果输出0, 说明路由转发没打开, 可以通过这个命令打开:
```shell script
echo 'echo "1">/proc/sys/net/ipv4/ip_forward' | ./scripts/netenter router1
```
现在`pc1`到`pc4`的网络可以互通了;

#### pc到路由器的连通
现在试试ping路由器`router1`的外网端口`eth0`:
```shell script
./scripts/netenter pc1 ping 192.168.64.1
```
可以ping通;

#### pc到宿主机的连通
试试ping宿主机的端口`vroute1`:
```shell script
./scripts/netenter pc1 ping 192.168.64.254
```
发现ping不通;
同样宿主机也无法ping通`pc1`
(如果ping通了, 也许是因为宿主机的网关那边有相同的ip, 或者因为宿主机能自己学习路由表, 例如安装了OSPF相关软件):
```shell script
ping 192.168.65.1
```
ping不通的原因是宿主机不知道192.168.65.1在哪, 
要让pc到宿主机连通有两个方案, 分别是NAT和路由表:
- NAT方案是在router1上开启NAT, 将pc的地址伪装成192.168.64.1, 再跟宿主机通信,
这个方案下, 宿主机不知道pc的存在, router1上还能配置防火墙规则禁止宿主机主动连接pc, 
就跟我们平时用的路由器那样;
- 路由表方案是在宿主机上增加路由规则, 让宿主机知道pc在vroute1端口下, 
这个方案下宿主机和pc可以直接互联, 如果我们把宿主机当成ISP, 那pc就相当于有了公网IP.

为了简单, 选择路由表方案, 直接在宿主机增加一条路由规则:
```shell script
sudo ip route add 192.168.64.0/18 via 192.168.64.1
```
(`192.168.64.0/18`这个网段包含了`192.168.65.1`)

现在`ping 192.168.65.1`, `./scripts/netenter pc1 ping 192.168.64.254`都能通了.

#### pc到外网
首先打开宿主机的路由转发:
```shell script
sudo sh -c 'echo "1">/proc/sys/net/ipv4/ip_forward'
```
这个时候尝试ping外网地址`./scripts/netenter pc1 ping 114.114.114.114`, 还是ping不通, 
原因跟上一节一样, 解决方案也是一样, 但是我们不应该改宿主机上级路由的路由表, 所以只能用NAT方案.
假设宿主机的外网端口是`eth0`, 那么执行这条命令增加NAT:
```shell script
sudo iptables -t nat -A POSTROUTING -s 192.168.64.0/18 -o eth0 -j MASQUERADE
```
再来一次`./scripts/netenter pc1 ping 114.114.114.114`,
好耶, pc可以访问外网了! (如果pc还是上不了网, 是不是因为宿主机本来就不能上网??)

本例完结, 其实宿主机也被当成路由器了.