let Account = {
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        account_password: "722537000a",
        account_list: [],
      },
      account_list_str: "",
    }
  },
  methods: {
    confirm: function () {
      let str_lines = this.account_list_str.split('\n')
      this.account_list = str_lines;

    }
  },
  mounted() {
    if (this.configs.account_list.length > 0) {
      this.account_list_str = this.configs.account_list.join("\n")
    }

  },
  template: `
  <div>
    <van-cell-group>
        <van-field v-model="account_list_str" label="多账号" type="textarea" rows="1" autosize placeholder="请输入多账号，一行一个账号" input-align="right" />
        <van-field v-model="configs.account_password" label="多账号密码" type="password" placeholder="请输入多账号密码" input-align="right" />
    </van-cell-group>
    <van-button type="primary" block @click="confirm">确认修改</van-button>
  </div>
  `
}