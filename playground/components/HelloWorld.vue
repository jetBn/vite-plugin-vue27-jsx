<template>
    <div class="name">
        HelloWorld
    </div>
</template>

<script>
    export default {
        created() {
            console.log('11xs')
        }
    }
</script>

<style lang="scss" scoped>
:deep(.box) {
    background: blue;
}
</style>