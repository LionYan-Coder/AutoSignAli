const AccountConfig = {
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        account_password: "",
        account_list: "",
        account_passport: ""
      },
    }
  },
  template: `
  <div>
      <van-cell-group>
          <van-field v-model="configs.account_list" label="多账号" type="textarea" rows="1" autosize placeholder="请输入多账号，一行一个账号" input-align="right" />
          <van-field v-model="configs.account_password" label="多账号默认密码" placeholder="请输入多账号密码" input-align="right" />
          <van-field v-model="configs.account_passport" label="多账号默认护照" placeholder="请输入多账号密码" input-align="right" />
      </van-cell-group>
  </div>
  `
}