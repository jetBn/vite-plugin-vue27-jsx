<template>
    <div class="content">
        <div class="table" :columns="columns">
            {{columns}}
        </div>
        <div class="box">
            <hello-world></hello-world>
            11xw
        </div>
    </div>
</template>

<script>
import SaDialogCommon from './components/dialog'
import HelloWorld from './components/HelloWorld.vue'

export default {
    components:{
        SaDialogCommon,
        HelloWorld
    },
    data() {
        return {
        };
    },
    computed: {
        columns() {
            const columns = [
                {
                    prop: 'name',
                    label: '任务名',
                },
                {
                    prop: 'deployTime',
                    label: '安装时间',
                    formatter: row => <span>{row.deployTime}</span>,
                },
                {
                    prop: 'description',
                    label: '描述',
                },
                {
                    prop: 'deployName',
                    label: '安装内容',
                },
                {
                    label: '操作',
                    width: 80,
                    formatter: row => (
                        <div class="action">
                   <sa-button onClick={() => this.goDetail(row)} type="text">查看详情</sa-button>
               </div>),
                },
            ];
            return columns;
        },
    },
    methods: {
        // 查看详情
        goDetail(row) {
            console.log(row)
        },
    },
};
</script>

<style lang="scss" scoped>
 .table{
    background: red;
 }

 :deep(.name) {
    background: green;
 }
</style>
