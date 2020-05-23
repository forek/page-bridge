## 小程序页面数据往返通讯工具 PageBridge
本项目中代码需要稍作调整才能应用到实际工作项目中 [uniapp代码示例](./uniapp.js)

### 功能简述
用于简化小程序页面之间数据往返操作</br>
场景：A页面跳转到B页面，B页面上用户需要输入一些信息，然后后退到A页面把信息显示出来

A页面：
```javascript
// 跳转方法
async goToBPage () {
  const result = await nav('/pages/b')
  console.log(result) // 'hello'
}
```

B页面：
```javascript
// 返回A页面方法
backToAPage () {
  goBack('hello') // 假设用户输入信息为 'hello'
}
```