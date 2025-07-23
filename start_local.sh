#!/bin/bash

# =========================================
# Jekyll 本地开发服务器启动脚本
# Author: xiaoqin.feng
# Copyright: 2019-2024. All Rights Reserved.
# =========================================

set -e  # 遇到错误时停止执行

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_PORT=4000
DEFAULT_HOST="localhost"
INCREMENTAL_BUILD=false
LIVERELOAD=true
DRAFTS=false
CLEAN_BUILD=false

# 配置 Homebrew Ruby 环境
setup_ruby_environment() {
    if [ -f "/opt/homebrew/opt/ruby/bin/ruby" ]; then
        export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
        export LDFLAGS="-L/opt/homebrew/opt/ruby/lib"
        export CPPFLAGS="-I/opt/homebrew/opt/ruby/include"
        export PKG_CONFIG_PATH="/opt/homebrew/opt/ruby/lib/pkgconfig"
        log_info "已配置 Homebrew Ruby 环境"
    elif [ -f "/usr/local/opt/ruby/bin/ruby" ]; then
        export PATH="/usr/local/opt/ruby/bin:$PATH"
        log_info "已配置 Homebrew Ruby 环境 (Intel Mac)"
    else
        log_warn "未检测到 Homebrew Ruby，使用系统 Ruby"
        log_warn "建议运行 'brew install ruby' 获得更好的兼容性"
    fi
}

# 帮助信息
show_help() {
    echo -e "${BLUE}Jekyll 本地开发服务器启动脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -p, --port PORT        指定端口号 (默认: 4000)"
    echo "  -h, --host HOST        指定主机地址 (默认: localhost)"
    echo "  -i, --incremental      启用增量构建"
    echo "  -d, --drafts          显示草稿文章"
    echo "  -l, --no-livereload   禁用实时重载"
    echo "  -c, --clean           清理并重新构建"
    echo "  --fix-ruby            修复 Ruby 环境问题"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                     # 使用默认配置启动"
    echo "  $0 -p 3000            # 使用端口 3000 启动"
    echo "  $0 -d -i              # 启用草稿和增量构建"
    echo "  $0 -c                 # 清理后启动"
    echo "  $0 --fix-ruby         # 修复 Ruby 环境"
}

# 修复 Ruby 环境
fix_ruby_environment() {
    log_info "开始修复 Ruby 环境..."
    
    # 检查 Homebrew
    if ! command -v brew &> /dev/null; then
        log_error "未检测到 Homebrew，请先安装 Homebrew:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # 安装 Homebrew Ruby
    if [ ! -f "/opt/homebrew/opt/ruby/bin/ruby" ] && [ ! -f "/usr/local/opt/ruby/bin/ruby" ]; then
        log_info "安装 Homebrew Ruby..."
        brew install ruby
    fi
    
    # 配置环境
    setup_ruby_environment
    
    # 重新安装依赖
    log_info "清理并重新安装依赖..."
    rm -rf vendor/bundle Gemfile.lock
    gem install bundler
    bundle install --path vendor/bundle
    
    log_info "Ruby 环境修复完成！"
    exit 0
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            DEFAULT_PORT="$2"
            shift 2
            ;;
        -h|--host)
            DEFAULT_HOST="$2"
            shift 2
            ;;
        -i|--incremental)
            INCREMENTAL_BUILD=true
            shift
            ;;
        -d|--drafts)
            DRAFTS=true
            shift
            ;;
        -l|--no-livereload)
            LIVERELOAD=false
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        --fix-ruby)
            fix_ruby_environment
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境依赖
check_environment() {
    log_info "检查环境依赖..."
    
    # 配置 Ruby 环境
    setup_ruby_environment
    
    # 检查 Ruby
    if ! command -v ruby &> /dev/null; then
        log_error "Ruby 未安装，请先安装 Ruby"
        log_error "可以运行 '$0 --fix-ruby' 自动修复"
        exit 1
    fi
    log_info "Ruby 版本: $(ruby --version)"
    log_info "Ruby 路径: $(which ruby)"
    
    # 检查 Bundler
    if ! command -v bundle &> /dev/null; then
        log_error "Bundler 未安装，尝试自动安装..."
        gem install bundler
    fi
    log_info "Bundler 版本: $(bundle --version)"
    
    # 检查 Gemfile
    if [ ! -f "Gemfile" ]; then
        log_error "找不到 Gemfile，请确保在正确的项目目录中"
        exit 1
    fi
    
    # 检查是否需要修复 Ruby 环境
    if [[ "$(ruby --version)" == *"2.6"* ]] && [[ "$(which ruby)" == "/usr/bin/ruby" ]]; then
        log_warn "检测到系统 Ruby，可能会出现编译问题"
        log_warn "建议运行 '$0 --fix-ruby' 修复环境"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "检查并安装 Ruby 依赖..."
    
    if [ ! -f "Gemfile.lock" ] || [ "Gemfile" -nt "Gemfile.lock" ]; then
        log_info "安装/更新依赖包..."
        bundle install --path vendor/bundle
    else
        log_info "依赖包已是最新，跳过安装"
    fi
}

# 清理构建
clean_build() {
    if [ "$CLEAN_BUILD" = true ]; then
        log_info "清理之前的构建文件..."
        if [ -d "_site" ]; then
            rm -rf _site
            log_info "已删除 _site 目录"
        fi
        if [ -d ".jekyll-cache" ]; then
            rm -rf .jekyll-cache
            log_info "已删除 .jekyll-cache 目录"
        fi
    fi
}

# 构建 Jekyll 命令
build_jekyll_command() {
    local cmd="bundle exec jekyll serve"
    cmd="$cmd --host $DEFAULT_HOST"
    cmd="$cmd --port $DEFAULT_PORT"
    
    if [ "$INCREMENTAL_BUILD" = true ]; then
        cmd="$cmd --incremental"
    fi
    
    if [ "$DRAFTS" = true ]; then
        cmd="$cmd --drafts"
    fi
    
    if [ "$LIVERELOAD" = true ]; then
        cmd="$cmd --livereload"
    fi
    
    echo "$cmd"
}

# 显示启用的功能
show_enabled_features() {
    if [ "$INCREMENTAL_BUILD" = true ]; then
        log_info "启用增量构建模式"
    fi
    
    if [ "$DRAFTS" = true ]; then
        log_info "启用草稿显示"
    fi
    
    if [ "$LIVERELOAD" = true ]; then
        log_info "启用实时重载"
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -Pi :$DEFAULT_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "端口 $DEFAULT_PORT 已被占用"
        echo -e "${YELLOW}正在使用该端口的进程:${NC}"
        lsof -Pi :$DEFAULT_PORT -sTCP:LISTEN
        echo ""
        read -p "是否要杀死占用端口的进程并继续？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "正在停止占用端口 $DEFAULT_PORT 的进程..."
            lsof -ti:$DEFAULT_PORT | xargs kill -9 2>/dev/null || true
            log_info "进程已停止"
        else
            log_info "操作已取消"
            exit 1
        fi
    fi
}

# 主函数
main() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}  Jekyll 本地开发服务器启动脚本${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    
    # 环境检查
    check_environment
    
    # 安装依赖
    install_dependencies
    
    # 清理构建
    clean_build
    
    # 检查端口
    check_port
    
    # 显示启用的功能
    show_enabled_features
    
    # 构建启动命令
    jekyll_cmd=$(build_jekyll_command)
    
    echo ""
    log_info "启动配置:"
    echo "  - 主机: $DEFAULT_HOST"
    echo "  - 端口: $DEFAULT_PORT"
    echo "  - 增量构建: $INCREMENTAL_BUILD"
    echo "  - 显示草稿: $DRAFTS"
    echo "  - 实时重载: $LIVERELOAD"
    echo ""
    
    log_info "启动 Jekyll 开发服务器..."
    log_info "命令: $jekyll_cmd"
    echo ""
    echo -e "${GREEN}服务器将在以下地址启动:${NC}"
    echo "  - 本地访问: http://$DEFAULT_HOST:$DEFAULT_PORT"
    if [ "$DEFAULT_HOST" = "localhost" ]; then
        local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        if [ -n "$local_ip" ]; then
            echo "  - 网络访问: http://$local_ip:$DEFAULT_PORT"
        else
            echo "  - 网络访问: http://127.0.0.1:$DEFAULT_PORT"
        fi
    fi
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"
    echo ""
    
    # 启动服务器
    eval $jekyll_cmd
}

# 信号处理
trap 'log_info "正在停止服务器..."; exit 0' INT TERM

# 执行主函数
main
