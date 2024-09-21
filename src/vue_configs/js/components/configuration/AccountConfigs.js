const AccountConfig = {
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        account_password: "",
        account_list: "",
      },
    }
  },
  template: `
  <div>
      <van-cell-group>
          <van-field v-model="configs.account_list" label="多账号" type="textarea" rows="1" autosize placeholder="请输入多账号，一行一个账号" input-align="right" />
          <van-field v-model="configs.account_password" label="多账号密码" type="password" placeholder="请输入多账号密码" input-align="right" />
      </van-cell-group>
  </div>
  `
}